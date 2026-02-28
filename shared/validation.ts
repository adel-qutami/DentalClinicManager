import { z } from "zod";

export const PHONE_REGEX = /^05\d{8}$/;

export const phoneSchema = z.string().regex(PHONE_REGEX, "رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام");

export const positiveDecimal = z.coerce.number().min(0, "القيمة يجب أن تكون 0 أو أكثر");

export const strictPositiveDecimal = z.coerce.number().positive("القيمة يجب أن تكون أكبر من صفر");

export const positiveInt = z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل");

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ يجب أن يكون بتنسيق YYYY-MM-DD");

export const ageSchema = z.coerce.number().int().min(0, "العمر لا يمكن أن يكون سالباً").max(150, "العمر غير منطقي");

export function calculateTotalFromItems(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function validatePaymentAmount(
  paymentAmount: number,
  totalAmount: number,
  currentPaid: number
): { valid: boolean; error?: string } {
  if (paymentAmount <= 0) {
    return { valid: false, error: "مبلغ الدفعة يجب أن يكون أكبر من صفر" };
  }
  const remaining = totalAmount - currentPaid;
  if (remaining <= 0) {
    return { valid: false, error: "تم سداد كامل المبلغ بالفعل" };
  }
  if (paymentAmount > remaining + 0.01) {
    return { valid: false, error: `مبلغ الدفعة يتجاوز المبلغ المتبقي (${remaining.toFixed(2)} ر.س)` };
  }
  return { valid: true };
}

export function validateEditVisitTotal(
  newTotal: number,
  paidAmount: number
): { valid: boolean; error?: string } {
  if (newTotal < 0) {
    return { valid: false, error: "إجمالي الزيارة لا يمكن أن يكون سالباً" };
  }
  if (newTotal < paidAmount) {
    return { valid: false, error: `لا يمكن تقليل الإجمالي (${newTotal}) عن المبلغ المدفوع (${paidAmount})` };
  }
  return { valid: true };
}
