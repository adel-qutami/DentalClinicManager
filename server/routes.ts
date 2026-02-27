import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertPatientSchema,
  insertAppointmentSchema,
  insertServiceSchema,
  insertVisitSchema,
  insertExpenseSchema,
  insertVisitItemSchema,
} from "@shared/schema";
import { z } from "zod";
import { triggerRemindersManually } from "./scheduler";
import { hasPermission, type Role, type Permission } from "@shared/permissions";

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
    const allowed = permissions.some((p) => hasPermission(role, p));
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

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = z
        .object({ username: z.string(), password: z.string() })
        .parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صالحة" });
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

  app.post("/api/auth/register", async (req, res) => {
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
      const user = await storage.createUser({ username, password, role });
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  app.get("/api/patients", async (req, res) => {
    const patients = await storage.getAllPatients();
    res.json(patients);
  });

  app.get("/api/patients/:id", async (req, res) => {
    const patient = await storage.getPatient(req.params.id);
    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }
    res.json(patient);
  });

  app.post("/api/patients", async (req, res) => {
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
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
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
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  app.get("/api/services", async (req, res) => {
    const services = await storage.getAllServices();
    res.json(services);
  });

  app.get("/api/services/:id", async (req, res) => {
    const service = await storage.getService(req.params.id);
    if (!service) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    res.json(service);
  });

  app.post("/api/services", async (req, res) => {
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
      res.status(400).json({ message: "Invalid service data" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
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
      res.status(400).json({ message: "Invalid service data" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      const oldService = await storage.getService(req.params.id);
      await storage.deleteService(req.params.id);
      await storage.createAuditLog({
        userId: null,
        entityName: "service",
        entityId: req.params.id,
        actionType: "delete",
        oldValues: oldService,
        newValues: null,
      });
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete service" });
    }
  });

  app.get("/api/appointments", async (req, res) => {
    const appointments = await storage.getAllAppointments();
    res.json(appointments);
  });

  app.get("/api/appointments/:id", async (req, res) => {
    const appointment = await storage.getAppointment(req.params.id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    res.json(appointment);
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const validated = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validated);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(400).json({ message: "Invalid appointment data" });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const validated = insertAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateAppointment(req.params.id, validated);
      res.json(appointment);
    } catch (error) {
      res.status(400).json({ message: "Invalid appointment data" });
    }
  });

  app.get("/api/visits", async (req, res) => {
    const visits = await storage.getAllVisits();
    res.json(visits);
  });

  app.get("/api/visits/:id", async (req, res) => {
    const visit = await storage.getVisit(req.params.id);
    if (!visit) {
      res.status(404).json({ message: "Visit not found" });
      return;
    }
    res.json(visit);
  });

  app.post("/api/visits", async (req, res) => {
    try {
      const { items, ...visitData } = req.body;
      const validatedVisit = insertVisitSchema.parse(visitData);
      const validatedItems = z.array(insertVisitItemSchema).parse(items || []);

      const visit = await storage.createVisit(validatedVisit, validatedItems);
      await storage.createAuditLog({
        userId: null,
        entityName: "visit",
        entityId: visit.id,
        actionType: "create",
        oldValues: null,
        newValues: visit,
      });
      res.status(201).json(visit);
    } catch (error) {
      res.status(400).json({ message: "Invalid visit data" });
    }
  });

  app.patch("/api/visits/:id", async (req, res) => {
    try {
      const { items, ...visitData } = req.body;
      const oldVisit = await storage.getVisit(req.params.id);

      if (items && Array.isArray(items)) {
        const validatedItems = z.array(insertVisitItemSchema).parse(items);
        const validatedVisit = insertVisitSchema.partial().parse(visitData);
        const visit = await storage.updateVisitWithItems(req.params.id, validatedVisit, validatedItems);
        await storage.createAuditLog({
          userId: null,
          entityName: "visit",
          entityId: req.params.id,
          actionType: "update",
          oldValues: oldVisit,
          newValues: visit,
        });
        res.json(visit);
      } else {
        const validated = insertVisitSchema.partial().parse(visitData);
        const visit = await storage.updateVisit(req.params.id, validated);
        await storage.createAuditLog({
          userId: null,
          entityName: "visit",
          entityId: req.params.id,
          actionType: "update",
          oldValues: oldVisit,
          newValues: visit,
        });
        res.json(visit);
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid visit data" });
    }
  });

  app.delete("/api/visits/:id", async (req, res) => {
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

  app.get("/api/visits/:visitId/payments", async (req, res) => {
    const payments = await storage.getPaymentsForVisit(req.params.visitId);
    res.json(payments);
  });

  app.get("/api/payments", async (req, res) => {
    const payments = await storage.getAllPayments();
    res.json(payments);
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validated = z.object({
        visitId: z.string(),
        date: z.string(),
        amount: z.coerce.number(),
        note: z.string().optional(),
      }).parse(req.body);
      const payment = await storage.createPayment(validated);
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ message: "Invalid payment data" });
    }
  });

  app.get("/api/expenses", async (req, res) => {
    const expenses = await storage.getAllExpenses();
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
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
      res.status(400).json({ message: "Invalid expense data" });
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

  app.get("/api/reminder-logs", async (req, res) => {
    try {
      const logs = await storage.getReminderLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reminder logs" });
    }
  });

  app.post("/api/reminders/send-test", async (req, res) => {
    try {
      const count = await triggerRemindersManually();
      res.json({ message: `Created ${count} reminder(s) for tomorrow's appointments` });
    } catch (error) {
      res.status(500).json({ message: "Failed to trigger reminders" });
    }
  });

  app.get("/api/reports/financial", async (req, res) => {
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
      res.status(400).json({ message: "Invalid role data" });
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
      const user = await storage.createUser({ username, password, role });
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صالحة" });
    }
  });

  return httpServer;
}
