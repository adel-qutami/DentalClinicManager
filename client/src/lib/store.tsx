import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// --- Types ---

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
  defaultPrice: string | number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  date: string;
  period: 'morning' | 'evening';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface VisitItem {
  serviceId: string;
  price: number;
}

export interface Payment {
  id: string;
  date: string;
  amount: string | number;
  note?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  doctorName: string;
  diagnosis?: string;
  items: VisitItem[];
  totalAmount: string | number;
  paidAmount: string | number;
  notes?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: string | number;
  date: string;
  category: string;
  type: 'operational' | 'fixed' | 'withdrawal';
  notes?: string;
}

interface StoreContextType {
  patients: Patient[];
  services: Service[];
  appointments: Appointment[];
  visits: Visit[];
  expenses: Expense[];
  loading: boolean;
  
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  
  addAppointment: (appt: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointment: (id: string, appt: Partial<Appointment>) => Promise<void>;
  
  addVisit: (visit: Omit<Visit, 'id'>) => Promise<void>;
  updateVisit: (id: string, visit: Partial<Visit>) => Promise<void>;
  
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, service: Partial<Omit<Service, 'id'>>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  
  getPatient: (id: string) => Patient | undefined;
  getService: (id: string) => Service | undefined;
}

// --- Store Implementation ---

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const API_BASE = '/api';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [patientsRes, servicesRes, appointmentsRes, visitsRes, expensesRes] = await Promise.all([
          fetch(`${API_BASE}/patients`),
          fetch(`${API_BASE}/services`),
          fetch(`${API_BASE}/appointments`),
          fetch(`${API_BASE}/visits`),
          fetch(`${API_BASE}/expenses`),
        ]);

        if (patientsRes.ok) setPatients(await patientsRes.json());
        if (servicesRes.ok) setServices(await servicesRes.json());
        if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
        if (visitsRes.ok) setVisits(await visitsRes.json());
        if (expensesRes.ok) setExpenses(await expensesRes.json());
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const addPatient = async (patient: Omit<Patient, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patient.name,
          phone: patient.phone,
          age: Number(patient.age),
          gender: patient.gender,
          notes: patient.notes,
        }),
      });
      if (res.ok) {
        const newPatient = await res.json();
        setPatients(prev => [newPatient, ...prev]);
      }
    } catch (error) {
      console.error('Failed to add patient:', error);
    }
  };

  const updatePatient = async (id: string, data: Partial<Patient>) => {
    try {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setPatients(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch (error) {
      console.error('Failed to update patient:', error);
    }
  };

  const addAppointment = async (appt: Omit<Appointment, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appt),
      });
      if (res.ok) {
        const newAppt = await res.json();
        setAppointments(prev => [...prev, newAppt]);
      }
    } catch (error) {
      console.error('Failed to add appointment:', error);
    }
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    try {
      const res = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppointments(prev => prev.map(a => a.id === id ? updated : a));
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
    }
  };

  const addVisit = async (visit: Omit<Visit, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: visit.patientId,
          date: visit.date,
          doctorName: visit.doctorName,
          diagnosis: visit.diagnosis,
          totalAmount: Number(visit.totalAmount),
          paidAmount: Number(visit.paidAmount) || 0,
          notes: visit.notes,
          items: visit.items,
        }),
      });
      if (res.ok) {
        const newVisit = await res.json();
        setVisits(prev => [newVisit, ...prev]);
      }
    } catch (error) {
      console.error('Failed to add visit:', error);
    }
  };

  const updateVisit = async (id: string, data: Partial<Visit>) => {
    try {
      const res = await fetch(`${API_BASE}/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setVisits(prev => prev.map(v => v.id === id ? updated : v));
      }
    } catch (error) {
      console.error('Failed to update visit:', error);
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expense.title,
          amount: Number(expense.amount),
          date: expense.date,
          category: expense.category,
          type: expense.type,
          notes: expense.notes,
        }),
      });
      if (res.ok) {
        const newExpense = await res.json();
        setExpenses(prev => [newExpense, ...prev]);
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const addService = async (service: Omit<Service, 'id'>) => {
    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: service.name,
          defaultPrice: Number(service.defaultPrice),
        }),
      });
      if (res.ok) {
        const newService = await res.json();
        setServices(prev => [...prev, newService]);
      }
    } catch (error) {
      console.error('Failed to add service:', error);
    }
  };

  const updateService = async (id: string, data: Partial<Omit<Service, 'id'>>) => {
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          defaultPrice: data.defaultPrice ? Number(data.defaultPrice) : undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setServices(prev => prev.map(s => s.id === id ? updated : s));
      }
    } catch (error) {
      console.error('Failed to update service:', error);
    }
  };

  const deleteService = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setServices(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete service:', error);
    }
  };

  const getPatient = (id: string) => patients.find(p => p.id === id);
  const getService = (id: string) => services.find(s => s.id === id);

  return (
    <StoreContext.Provider value={{
      patients, services, appointments, visits, expenses, loading,
      addPatient, updatePatient, addAppointment, updateAppointment,
      addVisit, updateVisit, addExpense, addService, updateService, deleteService, getPatient, getService
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
