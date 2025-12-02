import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { addDays, format, subDays } from 'date-fns';

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
  defaultPrice: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  period: 'morning' | 'evening';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface VisitItem {
  serviceId: string;
  price: number; // Can be adjusted from default
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  doctorName: string;
  diagnosis?: string;
  items: VisitItem[];
  totalAmount: number;
  payments: Payment[];
  paidAmount: number; // Computed from payments for convenience, or manual override if needed (but better to be computed)
  notes?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
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
  
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  
  addAppointment: (appt: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, appt: Partial<Appointment>) => void;
  
  addVisit: (visit: Omit<Visit, 'id'>) => void;
  updateVisit: (id: string, visit: Partial<Visit>) => void;
  
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  
  addService: (service: Omit<Service, 'id'>) => void;
  
  getPatient: (id: string) => Patient | undefined;
  getService: (id: string) => Service | undefined;
}

// --- Mock Data ---

const INITIAL_PATIENTS: Patient[] = [
  { id: '1', name: 'أحمد محمد', phone: '0501234567', age: 30, gender: 'male', createdAt: '2023-01-15', notes: 'حساسية بنسلين' },
  { id: '2', name: 'سارة علي', phone: '0559876543', age: 25, gender: 'female', createdAt: '2023-02-20' },
  { id: '3', name: 'خالد عمر', phone: '0541112223', age: 45, gender: 'male', createdAt: '2023-03-10', notes: 'سكر' },
  { id: '4', name: 'منى يوسف', phone: '0563334445', age: 28, gender: 'female', createdAt: '2023-04-05' },
  { id: '5', name: 'ياسر حسن', phone: '0509998887', age: 12, gender: 'male', createdAt: '2023-05-01' },
];

const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'كشفية', defaultPrice: 50 },
  { id: '2', name: 'حشو عادي', defaultPrice: 150 },
  { id: '3', name: 'حشو عصب', defaultPrice: 350 },
  { id: '4', name: 'خلع', defaultPrice: 100 },
  { id: '5', name: 'خلع جراحي', defaultPrice: 300 },
  { id: '6', name: 'تبييض أسنان', defaultPrice: 500 },
  { id: '7', name: 'تنظيف جير', defaultPrice: 200 },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: '1', patientId: '1', doctorName: 'د. سامي', date: format(new Date(), 'yyyy-MM-dd'), period: 'morning', status: 'scheduled' },
  { id: '2', patientId: '2', doctorName: 'د. سامي', date: format(new Date(), 'yyyy-MM-dd'), period: 'evening', status: 'scheduled' },
  { id: '3', patientId: '3', doctorName: 'د. نورة', date: format(addDays(new Date(), 1), 'yyyy-MM-dd'), period: 'morning', status: 'scheduled' },
];

const INITIAL_VISITS: Visit[] = [
  { 
    id: '1', 
    patientId: '1', 
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), 
    doctorName: 'د. سامي',
    items: [{ serviceId: '1', price: 50 }, { serviceId: '7', price: 200 }],
    totalAmount: 250,
    payments: [{ id: 'p1', date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), amount: 250 }],
    paidAmount: 250
  },
  { 
    id: '2', 
    patientId: '4', 
    date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), 
    doctorName: 'د. نورة',
    items: [{ serviceId: '3', price: 350 }],
    totalAmount: 350,
    payments: [{ id: 'p2', date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), amount: 100 }],
    paidAmount: 100,
    notes: 'باقي المبلغ الاسبوع القادم'
  }
];

const INITIAL_EXPENSES: Expense[] = [
  { id: '1', title: 'فواتير كهرباء', amount: 450, date: format(subDays(new Date(), 10), 'yyyy-MM-dd'), category: 'فواتير', type: 'fixed' },
  { id: '2', title: 'مواد طبية', amount: 1200, date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), category: 'مشتريات', type: 'operational' },
  { id: '3', title: 'سحب شخصي', amount: 5000, date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), category: 'سحبيات', type: 'withdrawal' },
];

// --- Store Implementation ---

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [visits, setVisits] = useState<Visit[]>(INITIAL_VISITS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);

  const addPatient = (patient: Omit<Patient, 'id' | 'createdAt'>) => {
    const newPatient = { 
      ...patient, 
      id: Math.random().toString(36).substr(2, 9),
      createdAt: format(new Date(), 'yyyy-MM-dd')
    };
    setPatients(prev => [newPatient, ...prev]);
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const addAppointment = (appt: Omit<Appointment, 'id'>) => {
    const newAppt = { ...appt, id: Math.random().toString(36).substr(2, 9) };
    setAppointments(prev => [...prev, newAppt]);
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  };

  const addVisit = (visit: Omit<Visit, 'id'>) => {
    const newVisit = { ...visit, id: Math.random().toString(36).substr(2, 9) };
    setVisits(prev => [newVisit, ...prev]);
  };

  const updateVisit = (id: string, data: Partial<Visit>) => {
    setVisits(prev => prev.map(v => {
      if (v.id !== id) return v;
      const updatedVisit = { ...v, ...data };
      // Recalculate paidAmount if payments changed
      if (data.payments) {
        updatedVisit.paidAmount = data.payments.reduce((sum, p) => sum + p.amount, 0);
      }
      return updatedVisit;
    }));
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Math.random().toString(36).substr(2, 9) };
    setExpenses(prev => [newExpense, ...prev]);
  };
  
  const addService = (service: Omit<Service, 'id'>) => {
    const newService = { ...service, id: Math.random().toString(36).substr(2, 9) };
    setServices(prev => [...prev, newService]);
  };

  const getPatient = (id: string) => patients.find(p => p.id === id);
  const getService = (id: string) => services.find(s => s.id === id);

  return (
    <StoreContext.Provider value={{
      patients, services, appointments, visits, expenses,
      addPatient, updatePatient, addAppointment, updateAppointment,
      addVisit, updateVisit, addExpense, addService, getPatient, getService
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
