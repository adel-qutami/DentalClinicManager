import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import path from "path";
import fs from "fs";
import {
  insertPatientSchema,
  insertAppointmentSchema,
  insertServiceSchema,
  insertVisitSchema,
  insertExpenseSchema,
  insertVisitItemSchema,
  insertExpenseCategorySchema,
  insertPublicBookingSchema,
} from "@shared/schema";
import { z, ZodError } from "zod";
import { sql as drizzleSql } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { hasPermission, type Role, type Permission } from "@shared/permissions";
import { calculateTotalFromItems, validatePaymentAmount, validateEditVisitTotal } from "@shared/validation";

const BCRYPT_ROUNDS = 12;
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(stored: string, supplied: string): Promise<boolean> {
  if (stored.startsWith("$2")) {
    return bcrypt.compare(supplied, stored);
  }
  if (stored.includes(".")) {
    const [hashed, salt] = stored.split(".");
    try {
      const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const hashedBuf = Buffer.from(hashed, "hex");
      if (buf.length !== hashedBuf.length) return false;
      return timingSafeEqual(buf, hashedBuf);
    } catch { return false; }
  }
  return stored === supplied;
}

async function upgradePasswordIfNeeded(userId: string, stored: string, plaintext: string): Promise<void> {
  if (!stored.startsWith("$2")) {
    const newHash = await hashPassword(plaintext);
    await storage.updateUser(userId, { password: newHash });
  }
}

function formatZodError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  }
  if (error instanceof Error) return error.message;
  return "بيانات غير صالحة";
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "غير مسجل الدخول" });
  }
  next();
}

function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "غير مسجل الدخول" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود" });
    }
    const role = user.role as Role;
    if (role === "manager") {
      return next();
    }
    const customPerms = user.customPermissions as string[] | null | undefined;
    let allowed: boolean;
    if (customPerms && Array.isArray(customPerms)) {
      allowed = permissions.some((p) => customPerms.includes(p));
    } else {
      allowed = permissions.some((p) => hasPermission(role, p));
    }
    if (!allowed) {
      return res.status(403).json({ message: "ليس لديك صلاحية لهذا الإجراء" });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  try {
    await db.execute(drizzleSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions json`);
  } catch (_) {}

  try {
    await db.execute(drizzleSql`
      CREATE TABLE IF NOT EXISTS public_bookings (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        phone text,
        service text NOT NULL,
        appointment_date date NOT NULL,
        appointment_time text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        notes text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (_) {}

  const smilecarePath = path.resolve(process.cwd(), "client/public/smilecare.html");
  if (fs.existsSync(smilecarePath)) {
    app.get("/", (_req, res) => {
      res.sendFile(smilecarePath);
    });
  }

  app.post("/api/public/bookings", async (req, res) => {
    try {
      const data = insertPublicBookingSchema.parse(req.body);
      const booking = await storage.createPublicBooking(data);
      return res.status(201).json(booking);
    } catch (error) {
      return res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.post("/api/admin/seed", async (req, res) => {
    const key = req.headers["x-seed-key"] || req.body?.seedKey;
    const expectedKey = process.env.SEED_KEY || "dental-seed-2024-secure";
    if (key !== expectedKey) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    try {
      const { seedProductionData } = await import("./seed-data");
      await seedProductionData();
      return res.json({ success: true, message: "تمت إضافة البيانات بنجاح" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "فشل التهيئة" });
    }
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "محاولات دخول كثيرة، يرجى المحاولة بعد 15 دقيقة" },
    skipSuccessfulRequests: true,
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { username, password } = z
        .object({ username: z.string(), password: z.string() })
        .parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || !(await verifyPassword(user.password, password))) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      await upgradePasswordIfNeeded(user.id, user.password, password);
      req.session.userId = user.id;
      req.session.save(() => {});
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "تم تسجيل الخروج" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "غير مسجل الدخول" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/register", requireAuth, requirePermission("users_manage"), async (req, res) => {
    try {
      const { username, password, role } = z
        .object({
          username: z.string().min(3),
          password: z.string().min(4),
          role: z.enum(["receptionist", "dentist", "manager"]).default("manager"),
        })
        .parse(req.body);
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const user = await storage.createUser({ username, password: await hashPassword(password), role });
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.get("/api/patients", requireAuth, async (req, res) => {
    const patients = await storage.getAllPatients();
    res.json(patients);
  });

  app.get("/api/patients/:id", requireAuth, async (req, res) => {
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }
    res.json(patient);
  });

  app.post("/api/patients", requireAuth, async (req, res) => {
    try {
      const validated = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validated);
      await storage.createAuditLog({
        userId: null,
        entityName: "patient",
        entityId: patient.id,
        actionType: "create",
        oldValues: null,
        newValues: patient,
      });
      res.status(201).json(patient);
    } catch (error) {
      console.error("Patient validation error:", error);
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.patch("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const oldPatient = await storage.getPatient(req.params.id);
      const validated = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(req.params.id, validated);
      await storage.createAuditLog({
        userId: null,
        entityName: "patient",
        entityId: req.params.id,
        actionType: "update",
        oldValues: oldPatient,
        newValues: patient,
      });
      res.json(patient);
    } catch (error) {
      console.error("Patient update validation error:", error);
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.delete("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const oldPatient = await storage.getPatient(req.params.id);
      if (!oldPatient) {
        return res.status(404).json({ message: "المريض غير موجود" });
      }
      await storage.deletePatient(req.params.id);
      await storage.createAuditLog({
        userId: req.session?.userId || null,
        entityName: "patient",
        entityId: req.params.id,
        actionType: "delete",
        oldValues: oldPatient,
        newValues: null,
      });
      res.status(204).send();
    } catch (error: any) {
      if (error?.code === "23503" || error?.message?.includes("foreign key")) {
        res.status(409).json({ message: "لا يمكن حذف مريض لديه زيارات أو مواعيد مسجلة" });
      } else {
        res.status(400).json({ message: "فشل في حذف المريض" });
      }
    }
  });

  app.get("/api/services", requireAuth, async (req, res) => {
    const services = await storage.getAllServices();
    res.json(services);
  });

  app.get("/api/services/:id", requireAuth, async (req, res) => {
    const service = await storage.getService(req.params.id);
    if (!service) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    res.json(service);
  });

  app.post("/api/services", requireAuth, async (req, res) => {
    try {
      const validated = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validated);
      await storage.createAuditLog({
        userId: null,
        entityName: "service",
        entityId: service.id,
        actionType: "create",
        oldValues: null,
        newValues: service,
      });
      res.status(201).json(service);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.patch("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const oldService = await storage.getService(req.params.id);
      const validated = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, validated);
      await storage.createAuditLog({
        userId: null,
        entityName: "service",
        entityId: req.params.id,
        actionType: "update",
        oldValues: oldService,
        newValues: service,
      });
      res.json(service);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const oldService = await storage.getService(req.params.id);
      if (!oldService) {
        return res.status(404).json({ message: "الخدمة غير موجودة" });
      }
      await storage.deleteService(req.params.id);
      await storage.createAuditLog({
        userId: req.session?.userId || null,
        entityName: "service",
        entityId: req.params.id,
        actionType: "delete",
        oldValues: oldService,
        newValues: null,
      });
      res.status(204).send();
    } catch (error: any) {
      if (error?.code === "23503" || error?.message?.includes("foreign key")) {
        res.status(409).json({ message: "لا يمكن حذف خدمة مرتبطة بزيارات مسجلة" });
      } else {
        res.status(400).json({ message: "فشل في حذف الخدمة" });
      }
    }
  });

  app.get("/api/appointments", requireAuth, async (req, res) => {
    const appointments = await storage.getAllAppointments();
    res.json(appointments);
  });

  app.get("/api/appointments/:id", requireAuth, async (req, res) => {
    const appointment = await storage.getAppointment(req.params.id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    res.json(appointment);
  });

  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const validated = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validated);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.patch("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const validated = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, validated);
      res.json(appointment);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const oldAppt = await storage.getAppointment(req.params.id);
      if (!oldAppt) {
        return res.status(404).json({ message: "الموعد غير موجود" });
      }
      await storage.deleteAppointment(req.params.id);
      await storage.createAuditLog({
        userId: req.session?.userId || null,
        entityName: "appointment",
        entityId: req.params.id,
        actionType: "delete",
        oldValues: oldAppt,
        newValues: null,
      });
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: "فشل في حذف الموعد" });
    }
  });

  app.get("/api/visits", requireAuth, async (req, res) => {
    const visits = await storage.getAllVisits();
    res.json(visits);
  });

  app.get("/api/visits/:id", requireAuth, async (req, res) => {
    const visit = await storage.getVisit(req.params.id);
    if (!visit) {
      res.status(404).json({ message: "Visit not found" });
      return;
    }
    res.json(visit);
  });

  app.post("/api/visits", requireAuth, async (req, res) => {
    try {
      const { items, ...visitData } = req.body;
      const validatedItems = z.array(insertVisitItemSchema.omit({ visitId: true })).min(1, "يجب إضافة خدمة واحدة على الأقل").parse(items || []);
      const serverTotal = calculateTotalFromItems(validatedItems);
      const validatedVisit = insertVisitSchema.parse({
        ...visitData,
        totalAmount: serverTotal,
      });

      if (validatedVisit.paidAmount !== undefined && validatedVisit.paidAmount > serverTotal) {
        return res.status(400).json({ message: "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي" });
      }

      const visit = await storage.createVisit(validatedVisit, validatedItems);
      await storage.createAuditLog({
        userId: req.session?.userId || null,
        entityName: "visit",
        entityId: visit.id,
        actionType: "create",
        oldValues: null,
        newValues: visit,
      });
      res.status(201).json(visit);
    } catch (error: any) {
      const message = error?.issues ? error.issues.map((i: any) => i.message).join(", ") : "بيانات الزيارة غير صالحة";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/visits/:id", requireAuth, async (req, res) => {
    try {
      const { items, ...visitData } = req.body;
      const oldVisit = await storage.getVisit(req.params.id);
      if (!oldVisit) {
        return res.status(404).json({ message: "الزيارة غير موجودة" });
      }

      const currentPaid = Number(oldVisit.paidAmount);

      if (items && Array.isArray(items)) {
        const validatedItems = z.array(insertVisitItemSchema.omit({ visitId: true })).min(1, "يجب إضافة خدمة واحدة على الأقل").parse(items);
        const serverTotal = calculateTotalFromItems(validatedItems);

        const totalCheck = validateEditVisitTotal(serverTotal, currentPaid);
        if (!totalCheck.valid) {
          return res.status(400).json({ message: totalCheck.error });
        }

        const validatedVisit = insertVisitSchema.partial().parse({
          ...visitData,
          totalAmount: serverTotal,
        });
        const visit = await storage.updateVisitWithItems(req.params.id, validatedVisit, validatedItems);
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          entityName: "visit",
          entityId: req.params.id,
          actionType: "update",
          oldValues: oldVisit,
          newValues: visit,
        });
        res.json(visit);
      } else {
        const validated = insertVisitSchema.partial().parse(visitData);

        if (validated.paidAmount !== undefined) {
          if (validated.paidAmount < 0) {
            return res.status(400).json({ message: "المبلغ المدفوع لا يمكن أن يكون سالباً" });
          }
          if (validated.paidAmount > Number(oldVisit.totalAmount)) {
            return res.status(400).json({ message: "المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الزيارة" });
          }
          const delta = validated.paidAmount - currentPaid;
          if (delta < 0) {
            return res.status(400).json({ message: "لا يمكن تقليل المبلغ المدفوع" });
          }
          if (delta > 0) {
            const remaining = Number(oldVisit.totalAmount) - currentPaid;
            if (delta > remaining + 0.01) {
              return res.status(400).json({ message: `مبلغ الدفعة يتجاوز المبلغ المتبقي (${remaining.toFixed(2)} ر.س)` });
            }
          }
        }

        const visit = await storage.updateVisit(req.params.id, validated);
        await storage.createAuditLog({
          userId: req.session?.userId || null,
          entityName: "visit",
          entityId: req.params.id,
          actionType: "update",
          oldValues: oldVisit,
          newValues: visit,
        });
        res.json(visit);
      }
    } catch (error: any) {
      const message = error?.issues ? error.issues.map((i: any) => i.message).join(", ") : "بيانات الزيارة غير صالحة";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/visits/:id", requireAuth, async (req, res) => {
    try {
      const oldVisit = await storage.getVisit(req.params.id);
      await storage.deleteVisit(req.params.id);
      await storage.createAuditLog({
        userId: null,
        entityName: "visit",
        entityId: req.params.id,
        actionType: "delete",
        oldValues: oldVisit,
        newValues: null,
      });
      res.status(204).send();
    } catch (error: any) {
      if (error.message?.includes("Cannot delete visit with existing payments")) {
        res.status(409).json({ message: "لا يمكن حذف زيارة بها دفعات مسجلة" });
      } else {
        res.status(400).json({ message: "Failed to delete visit" });
      }
    }
  });

  app.get("/api/visits/:visitId/payments", requireAuth, async (req, res) => {
    const payments = await storage.getPaymentsForVisit(req.params.visitId);
    res.json(payments);
  });

  app.get("/api/payments", requireAuth, async (req, res) => {
    const payments = await storage.getAllPayments();
    res.json(payments);
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const validated = z.object({
        visitId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount: z.coerce.number().positive("مبلغ الدفعة يجب أن يكون أكبر من صفر"),
        note: z.string().optional(),
      }).parse(req.body);

      const visit = await storage.getVisit(validated.visitId);
      if (!visit) {
        return res.status(404).json({ message: "الزيارة غير موجودة" });
      }

      const paymentCheck = validatePaymentAmount(
        validated.amount,
        Number(visit.totalAmount),
        Number(visit.paidAmount)
      );
      if (!paymentCheck.valid) {
        return res.status(400).json({ message: paymentCheck.error });
      }

      const payment = await storage.createPayment(validated);
      res.status(201).json(payment);
    } catch (error: any) {
      const message = error?.issues ? error.issues.map((i: any) => i.message).join(", ") : "بيانات الدفعة غير صالحة";
      res.status(400).json({ message });
    }
  });

  app.get("/api/expenses", requireAuth, async (req, res) => {
    const expenses = await storage.getAllExpenses();
    res.json(expenses);
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      await storage.createAuditLog({
        userId: null,
        entityName: "expense",
        entityId: expense.id,
        actionType: "create",
        oldValues: null,
        newValues: expense,
      });
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const oldExpense = await storage.getAllExpenses().then(all => all.find(e => e.id === req.params.id));
      const validated = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validated);
      await storage.createAuditLog({
        userId: req.session?.userId || null,
        entityName: "expense",
        entityId: req.params.id,
        actionType: "update",
        oldValues: oldExpense || null,
        newValues: expense,
      });
      res.json(expense);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const oldExpense = await storage.getAllExpenses().then(all => all.find(e => e.id === req.params.id));
      if (!oldExpense) {
        return res.status(404).json({ message: "المصروف غير موجود" });
      }
      await storage.deleteExpense(req.params.id);
      await storage.createAuditLog({
        userId: req.session?.userId || null,
        entityName: "expense",
        entityId: req.params.id,
        actionType: "delete",
        oldValues: oldExpense,
        newValues: null,
      });
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "فشل في حذف المصروف" });
    }
  });

  app.get("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllExpenseCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب التصنيفات" });
    }
  });

  app.post("/api/expense-categories", requireAuth, requirePermission("finance_manage"), async (req, res) => {
    try {
      const data = insertExpenseCategorySchema.parse(req.body);
      const cat = await storage.createExpenseCategory(data);
      res.status(201).json(cat);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.patch("/api/expense-categories/:id", requireAuth, requirePermission("finance_manage"), async (req, res) => {
    try {
      const data = insertExpenseCategorySchema.partial().parse(req.body);
      const cat = await storage.updateExpenseCategory(req.params.id, data);
      res.json(cat);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.delete("/api/expense-categories/:id", requireAuth, requirePermission("finance_manage"), async (req, res) => {
    try {
      await storage.deleteExpenseCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "فشل في حذف التصنيف" });
    }
  });

  app.get("/api/audit-logs", requireAuth, requirePermission("audit_view"), async (req, res) => {
    try {
      const entityName = req.query.entityName as string | undefined;
      const entityId = req.query.entityId as string | undefined;
      const logs = await storage.getAuditLogs(entityName, entityId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });


  app.get("/api/reports/financial", requireAuth, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        doctorName: req.query.doctorName as string | undefined,
        serviceType: req.query.serviceType as string | undefined,
      };
      const report = await storage.getFinancialReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate financial report" });
    }
  });

  app.get("/api/users", requireAuth, requirePermission("users_manage"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", requireAuth, requirePermission("users_manage"), async (req, res) => {
    try {
      const { role } = z.object({ role: z.enum(["receptionist", "dentist", "manager"]) }).parse(req.body);
      const user = await storage.updateUser(req.params.id, { role });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.post("/api/users", requireAuth, requirePermission("users_manage"), async (req, res) => {
    try {
      const { username, password, role } = z
        .object({
          username: z.string().min(3),
          password: z.string().min(4),
          role: z.enum(["receptionist", "dentist", "manager"]),
        })
        .parse(req.body);
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const user = await storage.createUser({ username, password: await hashPassword(password), role });
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.delete("/api/users/:id", requireAuth, requirePermission("users_manage"), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (sessionUser?.id === req.params.id) {
        return res.status(400).json({ message: "لا يمكنك حذف حسابك الخاص" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل حذف المستخدم" });
    }
  });

  app.patch("/api/users/:id/permissions", requireAuth, requirePermission("users_manage"), async (req, res) => {
    try {
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (targetUser.role === "manager") return res.status(400).json({ message: "لا يمكن تعديل صلاحيات المدير" });
      const { permissions } = z.object({
        permissions: z.array(z.string()).nullable(),
      }).parse(req.body);
      const user = await storage.updateUserPermissions(req.params.id, permissions);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.patch("/api/users/:id/password", requireAuth, requirePermission("users_manage"), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (sessionUser?.id === req.params.id) {
        return res.status(400).json({ message: "لا يمكنك إعادة تعيين كلمة مرورك من هنا" });
      }
      const { password } = z.object({ password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل") }).parse(req.body);
      const user = await storage.updateUser(req.params.id, { password: await hashPassword(password) });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.get("/api/bookings", requireAuth, async (_req, res) => {
    try {
      const bookings = await storage.getAllPublicBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "فشل جلب الحجوزات" });
    }
  });

  app.patch("/api/bookings/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = z.object({ status: z.enum(["pending", "confirmed", "cancelled"]) }).parse(req.body);
      const booking = await storage.updatePublicBookingStatus(req.params.id, status);
      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: formatZodError(error) });
    }
  });

  app.delete("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePublicBooking(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل حذف الحجز" });
    }
  });

  return httpServer;
}
