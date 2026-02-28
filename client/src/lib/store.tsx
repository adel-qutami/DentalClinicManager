import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { type Role, type Permission, hasPermission, getRoleLabel } from '@shared/permissions';

export type { Role, Permission };
export { hasPermission, getRoleLabel };

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

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
  requiresTeethSelection: boolean;
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
  quantity?: number;
  toothNumbers?: string[] | null;
  jawType?: string | null;
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
  items: VisitItem[];
  totalAmount: string | number;
  paidAmount: string | number;
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
  user: AuthUser | null;
  authLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (username: string, password: string, role: Role) => Promise<{ success: boolean; error?: string }>;
  can: (permission: Permission) => boolean;

  patients: Patient[];
  services: Service[];
  appointments: Appointment[];
  visits: Visit[];
  expenses: Expense[];
  loading: boolean;
  
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<{ success: boolean; error?: string }>;
  
  addAppointment: (appt: Omit<Appointment, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateAppointment: (id: string, appt: Partial<Appointment>) => Promise<{ success: boolean; error?: string }>;
  
  addVisit: (visit: Omit<Visit, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateVisit: (id: string, visit: Partial<Visit>) => Promise<{ success: boolean; error?: string }>;
  
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<{ success: boolean; error?: string }>;
  
  addService: (service: Omit<Service, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateService: (id: string, service: Partial<Omit<Service, 'id'>>) => Promise<{ success: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  addPayment: (visitId: string, date: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  getVisitPayments: (visitId: string) => Promise<Payment[]>;
  getPatient: (id: string) => Patient | undefined;
  getService: (id: string) => Service | undefined;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const API_BASE = '/api';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchOpts = { credentials: 'include' as RequestCredentials };
      const [patientsRes, servicesRes, appointmentsRes, visitsRes, expensesRes] = await Promise.all([
        fetch(`${API_BASE}/patients`, fetchOpts),
        fetch(`${API_BASE}/services`, fetchOpts),
        fetch(`${API_BASE}/appointments`, fetchOpts),
        fetch(`${API_BASE}/visits`, fetchOpts),
        fetch(`${API_BASE}/expenses`, fetchOpts),
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
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, fetchAllData]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل تسجيل الدخول' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
    setPatients([]);
    setServices([]);
    setAppointments([]);
    setVisits([]);
    setExpenses([]);
  };

  const register = async (username: string, password: string, role: Role): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, role }),
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل التسجيل' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال' };
    }
  };

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const addPatient = async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل إضافة المريض' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const updatePatient = async (id: string, data: Partial<Patient>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setPatients(prev => prev.map(p => p.id === id ? updated : p));
        return { success: true };
      }
      const errData = await res.json();
      return { success: false, error: errData.message || 'فشل تحديث بيانات المريض' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const addAppointment = async (appt: Omit<Appointment, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(appt),
      });
      if (res.ok) {
        const newAppt = await res.json();
        setAppointments(prev => [...prev, newAppt]);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل إضافة الموعد' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppointments(prev => prev.map(a => a.id === id ? updated : a));
        return { success: true };
      }
      const errData = await res.json();
      return { success: false, error: errData.message || 'فشل تحديث الموعد' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const addVisit = async (visit: Omit<Visit, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patientId: visit.patientId,
          date: visit.date,
          doctorName: visit.doctorName,
          totalAmount: Number(visit.totalAmount),
          paidAmount: Number(visit.paidAmount) || 0,
          items: visit.items,
        }),
      });
      if (res.ok) {
        const newVisit = await res.json();
        setVisits(prev => [newVisit, ...prev]);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل إضافة الزيارة' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const updateVisit = async (id: string, data: Partial<Visit>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setVisits(prev => prev.map(v => v.id === id ? updated : v));
        return { success: true };
      }
      const errData = await res.json();
      return { success: false, error: errData.message || 'فشل تحديث الزيارة' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل إضافة المصروف' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const addService = async (service: Omit<Service, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: service.name,
          defaultPrice: Number(service.defaultPrice),
          requiresTeethSelection: service.requiresTeethSelection ?? false,
        }),
      });
      if (res.ok) {
        const newService = await res.json();
        setServices(prev => [...prev, newService]);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل إضافة الخدمة' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const updateService = async (id: string, data: Partial<Omit<Service, 'id'>>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          defaultPrice: data.defaultPrice ? Number(data.defaultPrice) : undefined,
          requiresTeethSelection: data.requiresTeethSelection,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setServices(prev => prev.map(s => s.id === id ? updated : s));
        return { success: true };
      }
      const errData = await res.json();
      return { success: false, error: errData.message || 'فشل تحديث الخدمة' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const deleteService = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        setServices(prev => prev.filter(s => s.id !== id));
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل حذف الخدمة' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const addPayment = async (visitId: string, date: string, amount: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visitId, date, amount }),
      });
      if (res.ok) {
        const visitRes = await fetch(`${API_BASE}/visits`, { credentials: 'include' });
        if (visitRes.ok) setVisits(await visitRes.json());
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.message || 'فشل تسجيل الدفعة' };
    } catch (error) {
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    }
  };

  const getVisitPayments = async (visitId: string): Promise<Payment[]> => {
    try {
      const res = await fetch(`${API_BASE}/visits/${visitId}/payments`, { credentials: 'include' });
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  };

  const getPatient = (id: string) => patients.find(p => p.id === id);
  const getService = (id: string) => services.find(s => s.id === id);

  return (
    <StoreContext.Provider value={{
      user, authLoading, login, logout, register, can,
      patients, services, appointments, visits, expenses, loading,
      addPatient, updatePatient, addAppointment, updateAppointment,
      addVisit, updateVisit, addExpense, addService, updateService, deleteService, addPayment, getVisitPayments, getPatient, getService
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
