import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  date,
  timestamp,
  json,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("manager"),
  customPermissions: json("custom_permissions").$type<string[] | null>(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertRoleSchema = createInsertSchema(roles).pick({ name: true, description: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertPermissionSchema = createInsertSchema(permissions).pick({ name: true, description: true });
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

export const rolePermissions = pgTable("role_permissions", {
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});

export const userRoles = pgTable("user_roles", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
});

export const patients = pgTable(
  "patients",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    countryCode: text("country_code").notNull().default("+967"),
    phone: text("phone").notNull(),
    age: integer("age").notNull(),
    gender: text("gender").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("idx_patients_phone").on(table.phone)],
);

export const insertPatientSchema = createInsertSchema(patients)
  .pick({
    name: true,
    countryCode: true,
    phone: true,
    age: true,
    gender: true,
    notes: true,
  })
  .extend({
    name: z.string().min(2, "الاسم مطلوب ويجب أن يكون حرفين على الأقل").max(100),
    countryCode: z.string().default("+967"),
    phone: z.string().min(6, "رقم الهاتف قصير جداً").max(15, "رقم الهاتف طويل جداً").regex(/^\d[\d\s\-]{4,14}$/, "أدخل الرقم المحلي فقط بدون رمز الدولة"),
    age: z.coerce.number().int().min(0, "العمر لا يمكن أن يكون سالباً").max(150, "العمر غير منطقي"),
    gender: z.enum(["male", "female"]),
  });

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }).notNull(),
  requiresTeethSelection: boolean("requires_teeth_selection").notNull().default(false),
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  defaultPrice: true,
  requiresTeethSelection: true,
}).extend({
  name: z.string().min(2, "اسم الخدمة مطلوب"),
  defaultPrice: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
  requiresTeethSelection: z.boolean().optional().default(false),
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const appointments = pgTable(
  "appointments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    patientId: varchar("patient_id").notNull().references(() => patients.id),
    doctorId: varchar("doctor_id").references(() => users.id),
    doctorName: text("doctor_name"),
    date: date("date").notNull(),
    period: text("period").notNull(),
    status: text("status").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("idx_appointments_patient_id").on(table.patientId)],
);

export const insertAppointmentSchema = createInsertSchema(appointments)
  .pick({
    patientId: true,
    doctorId: true,
    doctorName: true,
    date: true,
    period: true,
    status: true,
    notes: true,
  })
  .extend({
    patientId: z.string().min(1, "المريض مطلوب"),
    doctorId: z.string().optional().nullable(),
    doctorName: z.string().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صالح"),
    period: z.enum(["morning", "evening"]),
    status: z.enum(["scheduled", "completed", "cancelled"]),
  });

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const payments = pgTable(
  "payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    visitId: varchar("visit_id").notNull().references(() => visits.id),
    date: date("date").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    type: text("type").notNull().default("manual"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("idx_payments_visit_id").on(table.visitId)],
);

export const insertPaymentSchema = createInsertSchema(payments)
  .pick({
    visitId: true,
    date: true,
    amount: true,
    type: true,
    note: true,
  })
  .extend({
    visitId: z.string().min(1, "الزيارة مطلوبة"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صالح"),
    amount: z.coerce.number().positive("مبلغ الدفعة يجب أن يكون أكبر من صفر"),
    type: z.enum(["initial", "manual"]).default("manual"),
  });

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const visitItems = pgTable("visit_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull().references(() => visits.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  toothNumbers: text("tooth_numbers").array(),
  jawType: text("jaw_type"),
});

export const insertVisitItemSchema = createInsertSchema(visitItems)
  .pick({
    visitId: true,
    serviceId: true,
    price: true,
    quantity: true,
    toothNumbers: true,
    jawType: true,
  })
  .extend({
    serviceId: z.string().min(1, "الخدمة مطلوبة"),
    price: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
    quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل"),
    toothNumbers: z.array(z.string()).optional().nullable(),
    jawType: z.enum(["single_tooth", "full_jaw_upper", "full_jaw_lower", "full_mouth"]).optional().nullable(),
  });

export type InsertVisitItem = z.infer<typeof insertVisitItemSchema>;
export type VisitItem = typeof visitItems.$inferSelect;

export const visits = pgTable(
  "visits",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    patientId: varchar("patient_id").notNull().references(() => patients.id),
    date: date("date").notNull(),
    doctorId: varchar("doctor_id").references(() => users.id),
    doctorName: text("doctor_name"),
    diagnosis: text("diagnosis"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("idx_visits_patient_id").on(table.patientId)],
);

export const insertVisitSchema = createInsertSchema(visits)
  .pick({
    patientId: true,
    date: true,
    doctorId: true,
    doctorName: true,
    diagnosis: true,
    totalAmount: true,
    notes: true,
  })
  .extend({
    patientId: z.string().min(1, "المريض مطلوب"),
    doctorId: z.string().optional().nullable(),
    doctorName: z.string().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صالح"),
    totalAmount: z.coerce.number().min(0, "الإجمالي لا يمكن أن يكون سالباً"),
  });

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect & { paidAmount: string };

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: timestamp("deleted_at"),
});

export const insertExpenseSchema = createInsertSchema(expenses)
  .pick({
    title: true,
    amount: true,
    date: true,
    category: true,
    type: true,
    notes: true,
  })
  .extend({
    title: z.string().min(1, "عنوان المصروف مطلوب"),
    category: z.string().min(1, "التصنيف مطلوب"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صالح"),
    amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
    type: z.enum(["operational", "fixed", "withdrawal"]),
  });

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  type: text("type").notNull().default("operational"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories)
  .pick({ name: true, type: true })
  .extend({
    name: z.string().min(2, "اسم التصنيف مطلوب"),
    type: z.enum(["operational", "fixed"]),
  });

export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  entityName: text("entity_name").notNull(),
  entityId: varchar("entity_id").notNull(),
  actionType: text("action_type").notNull(),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs)
  .pick({
    userId: true,
    entityName: true,
    entityId: true,
    actionType: true,
    oldValues: true,
    newValues: true,
    ipAddress: true,
    userAgent: true,
  });

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const publicBookings = pgTable("public_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  service: text("service").notNull(),
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPublicBookingSchema = createInsertSchema(publicBookings)
  .pick({ name: true, phone: true, service: true, appointmentDate: true, appointmentTime: true, notes: true })
  .extend({
    name: z.string().min(2, "الاسم مطلوب"),
    service: z.string().min(1, "الخدمة مطلوبة"),
    appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ غير صالح"),
    appointmentTime: z.string().min(1, "الوقت مطلوب"),
  });

export type InsertPublicBooking = z.infer<typeof insertPublicBookingSchema>;
export type PublicBooking = typeof publicBookings.$inferSelect;
