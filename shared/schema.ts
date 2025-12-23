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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(), // 'male' | 'female'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPatientSchema = createInsertSchema(patients)
  .pick({
    name: true,
    phone: true,
    age: true,
    gender: true,
    notes: true,
  })
  .extend({
    age: z.coerce.number(),
    gender: z.enum(["male", "female"]),
  });

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// Services table
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }).notNull(),
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  defaultPrice: true,
}).extend({
  defaultPrice: z.coerce.number(),
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  doctorName: text("doctor_name").notNull(),
  date: date("date").notNull(),
  period: text("period").notNull(), // 'morning' | 'evening'
  status: text("status").notNull(), // 'scheduled' | 'completed' | 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertAppointmentSchema = createInsertSchema(appointments)
  .pick({
    patientId: true,
    doctorName: true,
    date: true,
    period: true,
    status: true,
    notes: true,
  })
  .extend({
    date: z.string(),
    period: z.enum(["morning", "evening"]),
    status: z.enum(["scheduled", "completed", "cancelled"]),
  });

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull().references(() => visits.id),
  date: date("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPaymentSchema = createInsertSchema(payments)
  .pick({
    visitId: true,
    date: true,
    amount: true,
    note: true,
  })
  .extend({
    date: z.string(),
    amount: z.coerce.number(),
  });

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Visit items (line items in a visit)
export const visitItems = pgTable("visit_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull().references(() => visits.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertVisitItemSchema = createInsertSchema(visitItems)
  .pick({
    visitId: true,
    serviceId: true,
    price: true,
    quantity: true,
  })
  .extend({
    price: z.coerce.number(),
    quantity: z.coerce.number().int().min(1),
  });

export type InsertVisitItem = z.infer<typeof insertVisitItemSchema>;
export type VisitItem = typeof visitItems.$inferSelect;

// Visits table
export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  date: date("date").notNull(),
  doctorName: text("doctor_name").notNull(),
  diagnosis: text("diagnosis"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertVisitSchema = createInsertSchema(visits)
  .pick({
    patientId: true,
    date: true,
    doctorName: true,
    diagnosis: true,
    totalAmount: true,
    paidAmount: true,
    notes: true,
  })
  .extend({
    date: z.string(),
    totalAmount: z.coerce.number(),
    paidAmount: z.coerce.number().optional(),
  });

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(), // 'operational' | 'fixed' | 'withdrawal'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
    date: z.string(),
    amount: z.coerce.number(),
    type: z.enum(["operational", "fixed", "withdrawal"]),
  });

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
