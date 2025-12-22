import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

// Types
export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: 'male' | 'female';
  notes?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  defaultPrice: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  date: string;
  period: 'morning' | 'evening';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface VisitItem {
  id: string;
  visitId: string;
  serviceId: string;
  price: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  doctorName: string;
  diagnosis?: string;
  totalAmount: string;
  paidAmount: string;
  notes?: string;
  createdAt: string;
  items: VisitItem[];
}

export interface Payment {
  id: string;
  visitId: string;
  date: string;
  amount: string;
  note?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: string;
  date: string;
  category: string;
  type: 'operational' | 'fixed' | 'withdrawal';
  notes?: string;
  createdAt: string;
}

// Patients
export function usePatients() {
  return useQuery({
    queryKey: ["/api/patients"],
    staleTime: 30000,
  });
}

export function useCreatePatient() {
  return useMutation({
    mutationFn: async (data: Omit<Patient, 'id' | 'createdAt'>) => {
      const res = await apiRequest("POST", "/api/patients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });
}

export function useUpdatePatient() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Patient, 'id' | 'createdAt'>>;
    }) => {
      const res = await apiRequest("PATCH", `/api/patients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });
}

// Services
export function useServices() {
  return useQuery({
    queryKey: ["/api/services"],
    staleTime: 60000,
  });
}

export function useCreateService() {
  return useMutation({
    mutationFn: async (data: Omit<Service, 'id'>) => {
      const res = await apiRequest("POST", "/api/services", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
  });
}

// Appointments
export function useAppointments() {
  return useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 30000,
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: async (data: Omit<Appointment, 'id' | 'createdAt'>) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Appointment, 'id' | 'createdAt'>>;
    }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
  });
}

// Visits
export function useVisits() {
  return useQuery({
    queryKey: ["/api/visits"],
    staleTime: 30000,
  });
}

export function useCreateVisit() {
  return useMutation({
    mutationFn: async (data: Omit<Visit, 'id' | 'createdAt'>) => {
      const res = await apiRequest("POST", "/api/visits", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });
}

export function useUpdateVisit() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Visit, 'id' | 'createdAt'>>;
    }) => {
      const res = await apiRequest("PATCH", `/api/visits/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
    },
  });
}

// Payments
export function usePayments(visitId: string) {
  return useQuery({
    queryKey: ["/api/visits", visitId, "payments"],
    staleTime: 30000,
  });
}

export function useCreatePayment() {
  return useMutation({
    mutationFn: async (data: Omit<Payment, 'id' | 'createdAt'>) => {
      const res = await apiRequest("POST", "/api/payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
    },
  });
}

// Expenses
export function useExpenses() {
  return useQuery({
    queryKey: ["/api/expenses"],
    staleTime: 30000,
  });
}

export function useCreateExpense() {
  return useMutation({
    mutationFn: async (data: Omit<Expense, 'id' | 'createdAt'>) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
  });
}
