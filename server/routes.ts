import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertAppointmentSchema, insertServiceSchema, insertVisitSchema, insertExpenseSchema, insertVisitItemSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Patients endpoints
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
      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const validated = insertPatientSchema.partial().parse(req.body);
      const patient = await storage.updatePatient(req.params.id, validated);
      res.json(patient);
    } catch (error) {
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  // Services endpoints
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
      res.status(201).json(service);
    } catch (error) {
      res.status(400).json({ message: "Invalid service data" });
    }
  });

  // Appointments endpoints
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

  // Visits endpoints
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
      res.status(201).json(visit);
    } catch (error) {
      res.status(400).json({ message: "Invalid visit data" });
    }
  });

  app.patch("/api/visits/:id", async (req, res) => {
    try {
      const validated = insertVisitSchema.partial().parse(req.body);
      const visit = await storage.updateVisit(req.params.id, validated);
      res.json(visit);
    } catch (error) {
      res.status(400).json({ message: "Invalid visit data" });
    }
  });

  // Payments endpoints
  app.get("/api/visits/:visitId/payments", async (req, res) => {
    const payments = await storage.getPaymentsForVisit(req.params.visitId);
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

  // Expenses endpoints
  app.get("/api/expenses", async (req, res) => {
    const expenses = await storage.getAllExpenses();
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data" });
    }
  });

  return httpServer;
}
