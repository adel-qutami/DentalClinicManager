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
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;

  // Services
  getService(id: string): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  // Appointments
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(
    id: string,
    appointment: Partial<InsertAppointment>
  ): Promise<Appointment>;

  // Visits with items
  getVisit(id: string): Promise<(Visit & { items: VisitItem[] }) | undefined>;
  getAllVisits(): Promise<(Visit & { items: VisitItem[] })[]>;
  createVisit(
    visit: InsertVisit,
    items: InsertVisitItem[]
  ): Promise<Visit & { items: VisitItem[] }>;
  updateVisit(
    id: string,
    visit: Partial<InsertVisit>
  ): Promise<Visit & { items: VisitItem[] }>;

  // Payments
  getPaymentsForVisit(visitId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Expenses
  getAllExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
}

export class DatabaseStorage implements IStorage {
  // Users
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

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id));
    return result[0];
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const result = await db
      .insert(patients)
      .values({ ...patient, id })
      .returning();
    return result[0];
  }

  async updatePatient(
    id: string,
    patient: Partial<InsertPatient>
  ): Promise<Patient> {
    const result = await db
      .update(patients)
      .set(patient)
      .where(eq(patients.id, id))
      .returning();
    return result[0];
  }

  // Services
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

  async updateService(
    id: string,
    service: Partial<InsertService>
  ): Promise<Service> {
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

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return result[0];
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const result = await db
      .insert(appointments)
      .values({ ...appointment, id })
      .returning();
    return result[0];
  }

  async updateAppointment(
    id: string,
    appointment: Partial<InsertAppointment>
  ): Promise<Appointment> {
    const result = await db
      .update(appointments)
      .set(appointment)
      .where(eq(appointments.id, id))
      .returning();
    return result[0];
  }

  // Visits
  async getVisit(id: string): Promise<(Visit & { items: VisitItem[] }) | undefined> {
    const visit = await db.select().from(visits).where(eq(visits.id, id));
    if (!visit[0]) return undefined;

    const items = await db
      .select()
      .from(visitItems)
      .where(eq(visitItems.visitId, id));

    return { ...visit[0], items };
  }

  async getAllVisits(): Promise<(Visit & { items: VisitItem[] })[]> {
    const allVisits = await db.select().from(visits).orderBy(desc(visits.createdAt));

    const visitsWithItems = await Promise.all(
      allVisits.map(async (visit) => {
        const items = await db
          .select()
          .from(visitItems)
          .where(eq(visitItems.visitId, visit.id));
        return { ...visit, items };
      })
    );

    return visitsWithItems;
  }

  async createVisit(
    visit: InsertVisit,
    items: InsertVisitItem[]
  ): Promise<Visit & { items: VisitItem[] }> {
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

    return { ...insertedVisit[0], items: insertedItems };
  }

  async updateVisit(
    id: string,
    visit: Partial<InsertVisit>
  ): Promise<Visit & { items: VisitItem[] }> {
    const result = await db
      .update(visits)
      .set(visit as any)
      .where(eq(visits.id, id))
      .returning();

    const items = await db
      .select()
      .from(visitItems)
      .where(eq(visitItems.visitId, id));

    return { ...result[0], items };
  }

  // Payments
  async getPaymentsForVisit(visitId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.visitId, visitId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const result = await db
      .insert(payments)
      .values({ ...payment, id })
      .returning();
    return result[0];
  }

  // Expenses
  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const result = await db
      .insert(expenses)
      .values({ ...expense, id })
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
