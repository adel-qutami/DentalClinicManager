import { db } from "./db";
import {
  users,
  patients,
  services,
  appointments,
  visits,
  visitItems,
  payments,
  expenses,
  expenseCategories,
  auditLogs,
  publicBookings,
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type Service,
  type InsertService,
  type Appointment,
  type InsertAppointment,
  type Visit,
  type InsertVisit,
  type VisitItem,
  type InsertVisitItem,
  type Payment,
  type InsertPayment,
  type Expense,
  type InsertExpense,
  type ExpenseCategory,
  type InsertExpenseCategory,
  type AuditLog,
  type InsertAuditLog,
  type PublicBooking,
  type InsertPublicBooking,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getDoctors(): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  updateUserPermissions(id: string, permissions: string[] | null): Promise<User>;
  deleteUser(id: string): Promise<void>;

  getPatient(id: string): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: string): Promise<void>;

  getService(id: string): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  getAppointment(id: string): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;

  getVisit(id: string): Promise<(Visit & { items: VisitItem[] }) | undefined>;
  getAllVisits(): Promise<(Visit & { items: VisitItem[] })[]>;
  createVisit(visit: InsertVisit, items: InsertVisitItem[]): Promise<Visit & { items: VisitItem[] }>;
  createVisitWithInitialPayment(visit: InsertVisit, items: InsertVisitItem[], initialPayment: { amount: number; date: string }): Promise<Visit & { items: VisitItem[] }>;
  updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit & { items: VisitItem[] }>;
  updateVisitWithItems(id: string, visit: Partial<InsertVisit>, items: InsertVisitItem[]): Promise<Visit & { items: VisitItem[] }>;
  deleteVisit(id: string): Promise<void>;

  getPaymentsForVisit(visitId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  getAllExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  getAllExpenseCategories(): Promise<ExpenseCategory[]>;
  createExpenseCategory(cat: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, cat: Partial<InsertExpenseCategory>): Promise<ExpenseCategory>;
  deleteExpenseCategory(id: string): Promise<void>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityName?: string, entityId?: string): Promise<AuditLog[]>;

  getAllPatientsForBackup(): Promise<Patient[]>;
  getAllAppointmentsForBackup(): Promise<Appointment[]>;
  getAllVisitsForBackup(): Promise<(Visit & { items: VisitItem[] })[]>;
  getAllPaymentsForBackup(): Promise<Payment[]>;
  getAllExpensesForBackup(): Promise<Expense[]>;

  createPublicBooking(booking: InsertPublicBooking): Promise<PublicBooking>;
  getAllPublicBookings(): Promise<PublicBooking[]>;
  updatePublicBookingStatus(id: string, status: string): Promise<PublicBooking>;
  deletePublicBooking(id: string): Promise<void>;

  getFinancialReport(filters: {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    serviceType?: string;
  }): Promise<{
    visits: (Visit & { items: VisitItem[] })[];
    expenses: Expense[];
    payments: Payment[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const result = await db
      .insert(users)
      .values({ ...user, id })
      .returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getDoctors(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`${users.role} IN ('doctor', 'dentist', 'manager')`);
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserPermissions(id: string, permissions: string[] | null): Promise<User> {
    const result = await db
      .update(users)
      .set({ customPermissions: permissions })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)));
    return result[0];
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(isNull(patients.deletedAt))
      .orderBy(desc(patients.createdAt));
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const result = await db
      .insert(patients)
      .values({ ...patient, id })
      .returning();
    return result[0];
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient> {
    const result = await db
      .update(patients)
      .set(patient)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      .returning();
    return result[0];
  }

  async deletePatient(id: string): Promise<void> {
    const now = new Date();
    const patientVisits = await db
      .select({ id: visits.id })
      .from(visits)
      .where(and(eq(visits.patientId, id), isNull(visits.deletedAt)));

    for (const v of patientVisits) {
      await db
        .update(payments)
        .set({ deletedAt: now })
        .where(and(eq(payments.visitId, v.id), isNull(payments.deletedAt)));
      await db.delete(visitItems).where(eq(visitItems.visitId, v.id));
    }

    await db
      .update(visits)
      .set({ deletedAt: now })
      .where(and(eq(visits.patientId, id), isNull(visits.deletedAt)));

    await db
      .update(appointments)
      .set({ deletedAt: now })
      .where(and(eq(appointments.patientId, id), isNull(appointments.deletedAt)));

    await db
      .update(patients)
      .set({ deletedAt: now })
      .where(eq(patients.id, id));
  }

  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id));
    return result[0];
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async createService(service: InsertService): Promise<Service> {
    const id = randomUUID();
    const result = await db
      .insert(services)
      .values({ ...service, id })
      .returning();
    return result[0];
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service> {
    const result = await db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return result[0];
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)));
    return result[0];
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(isNull(appointments.deletedAt))
      .orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.date, startDate),
          lte(appointments.date, endDate),
          eq(appointments.status, "scheduled"),
          isNull(appointments.deletedAt),
        )
      );
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const result = await db
      .insert(appointments)
      .values({ ...appointment, id })
      .returning();
    return result[0];
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    const result = await db
      .update(appointments)
      .set(appointment)
      .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
      .returning();
    return result[0];
  }

  async deleteAppointment(id: string): Promise<void> {
    await db
      .update(appointments)
      .set({ deletedAt: new Date() })
      .where(eq(appointments.id, id));
  }

  async getVisit(id: string): Promise<(Visit & { items: VisitItem[] }) | undefined> {
    const visit = await db
      .select()
      .from(visits)
      .where(and(eq(visits.id, id), isNull(visits.deletedAt)));
    if (!visit[0]) return undefined;

    const items = await db
      .select()
      .from(visitItems)
      .where(eq(visitItems.visitId, id));

    const paidSums = await db
      .select({ total: sql<string>`CAST(COALESCE(SUM(${payments.amount}), 0) AS TEXT)` })
      .from(payments)
      .where(and(eq(payments.visitId, id), isNull(payments.deletedAt)));

    return { ...visit[0], paidAmount: paidSums[0]?.total ?? '0', items };
  }

  async getAllVisits(): Promise<(Visit & { items: VisitItem[] })[]> {
    const allVisits = await db
      .select()
      .from(visits)
      .where(isNull(visits.deletedAt))
      .orderBy(desc(visits.createdAt));

    const paidSums = await db
      .select({
        visitId: payments.visitId,
        total: sql<string>`CAST(COALESCE(SUM(${payments.amount}), 0) AS TEXT)`,
      })
      .from(payments)
      .where(isNull(payments.deletedAt))
      .groupBy(payments.visitId);

    const paidMap = new Map(paidSums.map(p => [p.visitId, p.total]));

    const allItems = await db.select().from(visitItems);

    return allVisits.map(v => ({
      ...v,
      paidAmount: paidMap.get(v.id) ?? '0',
      items: allItems.filter(i => i.visitId === v.id),
    }));
  }

  async createVisit(visit: InsertVisit, items: InsertVisitItem[]): Promise<Visit & { items: VisitItem[] }> {
    const id = randomUUID();
    const insertedVisit = await db
      .insert(visits)
      .values({ ...visit, id })
      .returning();

    const insertedItems = await Promise.all(
      items.map(async (item) => {
        const itemId = randomUUID();
        const result = await db
          .insert(visitItems)
          .values({ ...item, visitId: id, id: itemId })
          .returning();
        return result[0];
      })
    );

    return { ...insertedVisit[0], paidAmount: '0', items: insertedItems };
  }

  async createVisitWithInitialPayment(
    visit: InsertVisit,
    items: InsertVisitItem[],
    initialPayment: { amount: number; date: string }
  ): Promise<Visit & { items: VisitItem[] }> {
    return await db.transaction(async (tx) => {
      const visitId = randomUUID();
      const insertedVisit = await tx
        .insert(visits)
        .values({ ...visit, id: visitId })
        .returning();

      const insertedItems = await Promise.all(
        items.map(async (item) => {
          const itemId = randomUUID();
          const result = await tx
            .insert(visitItems)
            .values({ ...item, visitId, id: itemId })
            .returning();
          return result[0];
        })
      );

      await tx.insert(payments).values({
        id: randomUUID(),
        visitId,
        amount: String(initialPayment.amount),
        date: initialPayment.date,
        type: 'initial',
        note: "دفعة مقدمة عند إنشاء الزيارة",
      });

      return { ...insertedVisit[0], paidAmount: String(initialPayment.amount), items: insertedItems };
    });
  }

  async updateVisit(id: string, visit: Partial<InsertVisit>): Promise<Visit & { items: VisitItem[] }> {
    const result = await db
      .update(visits)
      .set(visit as any)
      .where(and(eq(visits.id, id), isNull(visits.deletedAt)))
      .returning();

    const items = await db
      .select()
      .from(visitItems)
      .where(eq(visitItems.visitId, id));

    const paidSums = await db
      .select({ total: sql<string>`CAST(COALESCE(SUM(${payments.amount}), 0) AS TEXT)` })
      .from(payments)
      .where(and(eq(payments.visitId, id), isNull(payments.deletedAt)));

    return { ...result[0], paidAmount: paidSums[0]?.total ?? '0', items };
  }

  async updateVisitWithItems(
    id: string,
    visit: Partial<InsertVisit>,
    items: InsertVisitItem[]
  ): Promise<Visit & { items: VisitItem[] }> {
    await db.delete(visitItems).where(eq(visitItems.visitId, id));

    if (Object.keys(visit).length > 0) {
      await db
        .update(visits)
        .set(visit as any)
        .where(and(eq(visits.id, id), isNull(visits.deletedAt)));
    }

    const insertedItems = await Promise.all(
      items.map(async (item) => {
        const itemId = randomUUID();
        const result = await db
          .insert(visitItems)
          .values({ ...item, visitId: id, id: itemId })
          .returning();
        return result[0];
      })
    );

    const updatedVisit = await db
      .select()
      .from(visits)
      .where(and(eq(visits.id, id), isNull(visits.deletedAt)));

    const paidSums = await db
      .select({ total: sql<string>`CAST(COALESCE(SUM(${payments.amount}), 0) AS TEXT)` })
      .from(payments)
      .where(and(eq(payments.visitId, id), isNull(payments.deletedAt)));

    return { ...updatedVisit[0], paidAmount: paidSums[0]?.total ?? '0', items: insertedItems };
  }

  async deleteVisit(id: string): Promise<void> {
    const now = new Date();
    await db
      .update(payments)
      .set({ deletedAt: now })
      .where(and(eq(payments.visitId, id), isNull(payments.deletedAt)));
    await db.delete(visitItems).where(eq(visitItems.visitId, id));
    await db
      .update(visits)
      .set({ deletedAt: now })
      .where(eq(visits.id, id));
  }

  async getPaymentsForVisit(visitId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(and(eq(payments.visitId, visitId), isNull(payments.deletedAt)))
      .orderBy(desc(payments.createdAt));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(isNull(payments.deletedAt))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const result = await db
      .insert(payments)
      .values({ ...payment, amount: String(payment.amount), id })
      .returning();

    return result[0];
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(isNull(expenses.deletedAt))
      .orderBy(desc(expenses.createdAt));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const result = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)));
    return result[0];
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const result = await db
      .insert(expenses)
      .values({ ...expense, amount: String(expense.amount), id })
      .returning();
    return result[0];
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const updateData: any = { ...expense };
    if (expense.amount !== undefined) {
      updateData.amount = String(expense.amount);
    }
    const result = await db
      .update(expenses)
      .set(updateData)
      .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)))
      .returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<void> {
    await db
      .update(expenses)
      .set({ deletedAt: new Date() })
      .where(eq(expenses.id, id));
  }

  async getAllExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).orderBy(expenseCategories.name);
  }

  async createExpenseCategory(cat: InsertExpenseCategory): Promise<ExpenseCategory> {
    const id = randomUUID();
    const result = await db.insert(expenseCategories).values({ ...cat, id }).returning();
    return result[0];
  }

  async updateExpenseCategory(id: string, cat: Partial<InsertExpenseCategory>): Promise<ExpenseCategory> {
    const result = await db.update(expenseCategories).set(cat).where(eq(expenseCategories.id, id)).returning();
    return result[0];
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const result = await db
      .insert(auditLogs)
      .values({ ...log, id })
      .returning();
    return result[0];
  }

  async getAuditLogs(entityName?: string, entityId?: string): Promise<AuditLog[]> {
    if (entityName && entityId) {
      return await db.select().from(auditLogs)
        .where(and(eq(auditLogs.entityName, entityName), eq(auditLogs.entityId, entityId)))
        .orderBy(desc(auditLogs.createdAt));
    } else if (entityName) {
      return await db.select().from(auditLogs)
        .where(eq(auditLogs.entityName, entityName))
        .orderBy(desc(auditLogs.createdAt));
    }
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  async getAllPatientsForBackup(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getAllAppointmentsForBackup(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAllVisitsForBackup(): Promise<(Visit & { items: VisitItem[] })[]> {
    const allVisits = await db.select().from(visits).orderBy(desc(visits.createdAt));
    const allItems = await db.select().from(visitItems);
    const paidSums = await db
      .select({
        visitId: payments.visitId,
        total: sql<string>`CAST(COALESCE(SUM(${payments.amount}), 0) AS TEXT)`,
      })
      .from(payments)
      .groupBy(payments.visitId);
    const paidMap = new Map(paidSums.map(p => [p.visitId, p.total]));
    return allVisits.map(v => ({
      ...v,
      paidAmount: paidMap.get(v.id) ?? '0',
      items: allItems.filter(i => i.visitId === v.id),
    }));
  }

  async getAllPaymentsForBackup(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getAllExpensesForBackup(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async getFinancialReport(filters: {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    serviceType?: string;
  }): Promise<{
    visits: (Visit & { items: VisitItem[] })[];
    expenses: Expense[];
    payments: Payment[];
  }> {
    const conditions: any[] = [isNull(visits.deletedAt)];
    if (filters.startDate) conditions.push(gte(visits.date, filters.startDate));
    if (filters.endDate) conditions.push(lte(visits.date, filters.endDate));
    if (filters.doctorId) conditions.push(eq(visits.doctorId, filters.doctorId));

    const filteredVisits = await db
      .select()
      .from(visits)
      .where(and(...conditions))
      .orderBy(desc(visits.createdAt));

    let visitsWithItems = await Promise.all(
      filteredVisits.map(async (visit) => {
        const items = await db.select().from(visitItems).where(eq(visitItems.visitId, visit.id));
        const paidSums = await db
          .select({ total: sql<string>`CAST(COALESCE(SUM(${payments.amount}), 0) AS TEXT)` })
          .from(payments)
          .where(and(eq(payments.visitId, visit.id), isNull(payments.deletedAt)));
        return { ...visit, paidAmount: paidSums[0]?.total ?? '0', items };
      })
    );

    if (filters.serviceType) {
      visitsWithItems = visitsWithItems.filter(v =>
        v.items.some(item => item.serviceId === filters.serviceType)
      );
    }

    const expenseConditions: any[] = [isNull(expenses.deletedAt)];
    if (filters.startDate) expenseConditions.push(gte(expenses.date, filters.startDate));
    if (filters.endDate) expenseConditions.push(lte(expenses.date, filters.endDate));

    const filteredExpenses = await db
      .select()
      .from(expenses)
      .where(and(...expenseConditions))
      .orderBy(desc(expenses.createdAt));

    const allPayments = await db
      .select()
      .from(payments)
      .where(isNull(payments.deletedAt))
      .orderBy(desc(payments.createdAt));

    return {
      visits: visitsWithItems,
      expenses: filteredExpenses,
      payments: allPayments,
    };
  }

  async createPublicBooking(booking: InsertPublicBooking): Promise<PublicBooking> {
    const result = await db.insert(publicBookings).values({ ...booking, id: randomUUID() }).returning();
    return result[0];
  }

  async getAllPublicBookings(): Promise<PublicBooking[]> {
    return db.select().from(publicBookings).orderBy(desc(publicBookings.createdAt));
  }

  async updatePublicBookingStatus(id: string, status: string): Promise<PublicBooking> {
    const result = await db.update(publicBookings).set({ status }).where(eq(publicBookings.id, id)).returning();
    if (!result[0]) throw new Error("الحجز غير موجود");
    return result[0];
  }

  async deletePublicBooking(id: string): Promise<void> {
    await db.delete(publicBookings).where(eq(publicBookings.id, id));
  }
}

export const storage = new DatabaseStorage();
