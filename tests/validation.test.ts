import { describe, it, expect } from "vitest";
import {
  calculateTotalFromItems,
  validatePaymentAmount,
  validateEditVisitTotal,
} from "../shared/validation";
import {
  insertPatientSchema,
  insertServiceSchema,
  insertVisitSchema,
  insertVisitItemSchema,
  insertPaymentSchema,
  insertExpenseSchema,
  insertAppointmentSchema,
} from "../shared/schema";

describe("calculateTotalFromItems", () => {
  it("calculates total correctly for single item", () => {
    expect(calculateTotalFromItems([{ price: 100, quantity: 1 }])).toBe(100);
  });

  it("calculates total correctly for multiple items", () => {
    expect(calculateTotalFromItems([
      { price: 100, quantity: 2 },
      { price: 250, quantity: 1 },
      { price: 50, quantity: 3 },
    ])).toBe(100 * 2 + 250 + 50 * 3);
  });

  it("returns 0 for empty array", () => {
    expect(calculateTotalFromItems([])).toBe(0);
  });

  it("handles decimal prices correctly", () => {
    expect(calculateTotalFromItems([{ price: 99.99, quantity: 2 }])).toBeCloseTo(199.98);
  });
});

describe("validatePaymentAmount", () => {
  it("accepts valid payment within remaining balance", () => {
    const result = validatePaymentAmount(200, 1000, 500);
    expect(result.valid).toBe(true);
  });

  it("accepts exact remaining amount", () => {
    const result = validatePaymentAmount(500, 1000, 500);
    expect(result.valid).toBe(true);
  });

  it("rejects payment exceeding remaining balance", () => {
    const result = validatePaymentAmount(600, 1000, 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("يتجاوز");
  });

  it("rejects zero payment", () => {
    const result = validatePaymentAmount(0, 1000, 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("أكبر من صفر");
  });

  it("rejects negative payment", () => {
    const result = validatePaymentAmount(-100, 1000, 500);
    expect(result.valid).toBe(false);
  });

  it("rejects payment when fully paid", () => {
    const result = validatePaymentAmount(100, 1000, 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("كامل المبلغ");
  });

  it("rejects payment when overpaid already", () => {
    const result = validatePaymentAmount(100, 1000, 1100);
    expect(result.valid).toBe(false);
  });
});

describe("validateEditVisitTotal", () => {
  it("accepts total greater than paid amount", () => {
    const result = validateEditVisitTotal(1000, 500);
    expect(result.valid).toBe(true);
  });

  it("accepts total equal to paid amount", () => {
    const result = validateEditVisitTotal(500, 500);
    expect(result.valid).toBe(true);
  });

  it("rejects total less than paid amount", () => {
    const result = validateEditVisitTotal(400, 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("لا يمكن تقليل");
  });

  it("rejects negative total", () => {
    const result = validateEditVisitTotal(-100, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("سالباً");
  });

  it("accepts zero total with zero paid", () => {
    const result = validateEditVisitTotal(0, 0);
    expect(result.valid).toBe(true);
  });
});

describe("insertPatientSchema", () => {
  const validPatient = {
    name: "أحمد محمد",
    phone: "0551234567",
    age: 30,
    gender: "male" as const,
    notes: "",
  };

  it("accepts valid patient data", () => {
    const result = insertPatientSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects single char name", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, name: "أ" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone format", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects phone not starting with 05", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, phone: "0612345678" });
    expect(result.success).toBe(false);
  });

  it("accepts valid phone starting with 05", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, phone: "0598765432" });
    expect(result.success).toBe(true);
  });

  it("rejects negative age", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, age: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects age over 150", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, age: 200 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid gender", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, gender: "other" });
    expect(result.success).toBe(false);
  });

  it("coerces age string to number", () => {
    const result = insertPatientSchema.safeParse({ ...validPatient, age: "25" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.age).toBe(25);
  });
});

describe("insertServiceSchema", () => {
  it("accepts valid service", () => {
    const result = insertServiceSchema.safeParse({
      name: "حشوة عادية",
      defaultPrice: 250,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    const result = insertServiceSchema.safeParse({
      name: "حشوة عادية",
      defaultPrice: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero price", () => {
    const result = insertServiceSchema.safeParse({
      name: "كشف مجاني",
      defaultPrice: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty service name", () => {
    const result = insertServiceSchema.safeParse({
      name: "",
      defaultPrice: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("insertVisitItemSchema", () => {
  const validItem = {
    visitId: "visit-1",
    serviceId: "svc-1",
    price: 250,
    quantity: 1,
  };

  it("accepts valid item", () => {
    const result = insertVisitItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    const result = insertVisitItemSchema.safeParse({ ...validItem, price: -50 });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = insertVisitItemSchema.safeParse({ ...validItem, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = insertVisitItemSchema.safeParse({ ...validItem, quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects decimal quantity", () => {
    const result = insertVisitItemSchema.safeParse({ ...validItem, quantity: 1.5 });
    expect(result.success).toBe(false);
  });

  it("accepts valid jawType", () => {
    const result = insertVisitItemSchema.safeParse({
      ...validItem,
      jawType: "full_jaw_upper",
      toothNumbers: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid jawType", () => {
    const result = insertVisitItemSchema.safeParse({
      ...validItem,
      jawType: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty serviceId", () => {
    const result = insertVisitItemSchema.safeParse({ ...validItem, serviceId: "" });
    expect(result.success).toBe(false);
  });
});

describe("insertVisitSchema", () => {
  const validVisit = {
    patientId: "patient-1",
    doctorName: "د. أحمد",
    date: "2026-02-28",
    totalAmount: 500,
    paidAmount: 0,
  };

  it("accepts valid visit", () => {
    const result = insertVisitSchema.safeParse(validVisit);
    expect(result.success).toBe(true);
  });

  it("rejects negative totalAmount", () => {
    const result = insertVisitSchema.safeParse({ ...validVisit, totalAmount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects negative paidAmount", () => {
    const result = insertVisitSchema.safeParse({ ...validVisit, paidAmount: -50 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = insertVisitSchema.safeParse({ ...validVisit, date: "28/02/2026" });
    expect(result.success).toBe(false);
  });

  it("rejects empty patientId", () => {
    const result = insertVisitSchema.safeParse({ ...validVisit, patientId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty doctorName", () => {
    const result = insertVisitSchema.safeParse({ ...validVisit, doctorName: "" });
    expect(result.success).toBe(false);
  });
});

describe("insertPaymentSchema", () => {
  const validPayment = {
    visitId: "visit-1",
    date: "2026-02-28",
    amount: 100,
  };

  it("accepts valid payment", () => {
    const result = insertPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = insertPaymentSchema.safeParse({ ...validPayment, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = insertPaymentSchema.safeParse({ ...validPayment, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date", () => {
    const result = insertPaymentSchema.safeParse({ ...validPayment, date: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty visitId", () => {
    const result = insertPaymentSchema.safeParse({ ...validPayment, visitId: "" });
    expect(result.success).toBe(false);
  });
});

describe("insertExpenseSchema", () => {
  const validExpense = {
    title: "إيجار",
    amount: 5000,
    date: "2026-02-01",
    category: "إيجار",
    type: "fixed" as const,
  };

  it("accepts valid expense", () => {
    const result = insertExpenseSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = insertExpenseSchema.safeParse({ ...validExpense, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = insertExpenseSchema.safeParse({ ...validExpense, amount: -1000 });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = insertExpenseSchema.safeParse({ ...validExpense, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const result = insertExpenseSchema.safeParse({ ...validExpense, category: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = insertExpenseSchema.safeParse({ ...validExpense, type: "expense" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid types", () => {
    for (const type of ["operational", "fixed", "withdrawal"]) {
      const result = insertExpenseSchema.safeParse({ ...validExpense, type });
      expect(result.success).toBe(true);
    }
  });
});

describe("insertAppointmentSchema", () => {
  const validAppointment = {
    patientId: "patient-1",
    doctorName: "د. أحمد",
    date: "2026-03-01",
    period: "morning" as const,
    status: "scheduled" as const,
  };

  it("accepts valid appointment", () => {
    const result = insertAppointmentSchema.safeParse(validAppointment);
    expect(result.success).toBe(true);
  });

  it("rejects invalid period", () => {
    const result = insertAppointmentSchema.safeParse({ ...validAppointment, period: "afternoon" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = insertAppointmentSchema.safeParse({ ...validAppointment, status: "pending" });
    expect(result.success).toBe(false);
  });

  it("rejects empty patientId", () => {
    const result = insertAppointmentSchema.safeParse({ ...validAppointment, patientId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = insertAppointmentSchema.safeParse({ ...validAppointment, date: "March 1, 2026" });
    expect(result.success).toBe(false);
  });
});

describe("Edge Cases - Combined Scenarios", () => {
  it("visit total recalculation matches items", () => {
    const items = [
      { serviceId: "s1", price: 800, quantity: 1 },
      { serviceId: "s2", price: 250, quantity: 2 },
    ];
    const total = calculateTotalFromItems(items);
    expect(total).toBe(1300);

    const visitResult = insertVisitSchema.safeParse({
      patientId: "p1",
      doctorName: "د. سامي",
      date: "2026-02-28",
      totalAmount: total,
      paidAmount: 500,
    });
    expect(visitResult.success).toBe(true);
  });

  it("prevents edit that reduces total below paid", () => {
    const currentPaid = 800;
    const newItems = [
      { serviceId: "s1", price: 200, quantity: 1 },
    ];
    const newTotal = calculateTotalFromItems(newItems);
    expect(newTotal).toBe(200);

    const check = validateEditVisitTotal(newTotal, currentPaid);
    expect(check.valid).toBe(false);
    expect(check.error).toContain("لا يمكن تقليل");
  });

  it("allows edit that keeps total above paid", () => {
    const currentPaid = 300;
    const newItems = [
      { serviceId: "s1", price: 500, quantity: 1 },
    ];
    const newTotal = calculateTotalFromItems(newItems);
    const check = validateEditVisitTotal(newTotal, currentPaid);
    expect(check.valid).toBe(true);
  });

  it("payment chain: multiple valid payments then final rejection", () => {
    const total = 1000;
    let paid = 0;

    const pay1 = validatePaymentAmount(300, total, paid);
    expect(pay1.valid).toBe(true);
    paid += 300;

    const pay2 = validatePaymentAmount(400, total, paid);
    expect(pay2.valid).toBe(true);
    paid += 400;

    const pay3 = validatePaymentAmount(300, total, paid);
    expect(pay3.valid).toBe(true);
    paid += 300;

    const pay4 = validatePaymentAmount(1, total, paid);
    expect(pay4.valid).toBe(false);
    expect(pay4.error).toContain("كامل المبلغ");
  });

  it("string coercion: price as string still validates min(0)", () => {
    const result = insertVisitItemSchema.safeParse({
      visitId: "v1",
      serviceId: "s1",
      price: "-50",
      quantity: "1",
    });
    expect(result.success).toBe(false);
  });

  it("string coercion: valid price as string passes", () => {
    const result = insertVisitItemSchema.safeParse({
      visitId: "v1",
      serviceId: "s1",
      price: "250",
      quantity: "2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(250);
      expect(result.data.quantity).toBe(2);
    }
  });
});
