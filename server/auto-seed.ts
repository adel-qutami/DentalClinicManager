import { db } from "./db";
import {
  patients,
  services,
  appointments,
  visits,
  visitItems,
  payments,
  expenses,
  users,
} from "@shared/schema";
import { format, subDays } from "date-fns";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

async function hashPasswordBcrypt(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function ensureDefaultUsers() {
  try {
    const existingUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const userCount = Number(existingUsers[0]?.count ?? 0);
    if (userCount > 0) return;

    console.log("[AutoSeed] No users found, creating default accounts...");
    await db.insert(users).values([
      { username: "admin", password: await hashPasswordBcrypt("admin123"), role: "manager" },
      { username: "dr_sami", password: await hashPasswordBcrypt("sami123"), role: "dentist" },
      { username: "dr_noura", password: await hashPasswordBcrypt("noura123"), role: "dentist" },
      { username: "reception", password: await hashPasswordBcrypt("reception123"), role: "receptionist" },
    ]);
    console.log("[AutoSeed] ✓ Default users created (admin/admin123, reception/reception123)");
  } catch (err) {
    console.error("[AutoSeed] Failed to create default users:", err);
  }
}

export async function autoSeedIfEmpty() {
  try {
    const existingServices = await db.select({ count: sql<number>`count(*)` }).from(services);
    const serviceCount = Number(existingServices[0]?.count ?? 0);

    if (serviceCount > 0) {
      console.log("[AutoSeed] Database already has data, skipping seed.");
      return;
    }

    console.log("[AutoSeed] Empty database detected, seeding basic data...");

    const allServices = await db
      .insert(services)
      .values([
        { name: "كشف وفحص أولي", defaultPrice: "100", requiresTeethSelection: false },
        { name: "تنظيف الأسنان", defaultPrice: "300", requiresTeethSelection: false },
        { name: "حشوة عادية", defaultPrice: "250", requiresTeethSelection: true },
        { name: "حشوة تجميلية", defaultPrice: "400", requiresTeethSelection: true },
        { name: "خلع سن عادي", defaultPrice: "200", requiresTeethSelection: true },
        { name: "خلع سن جراحي", defaultPrice: "500", requiresTeethSelection: true },
        { name: "علاج عصب", defaultPrice: "800", requiresTeethSelection: true },
        { name: "تلبيسة زيركون", defaultPrice: "1200", requiresTeethSelection: true },
        { name: "تبييض الأسنان", defaultPrice: "1500", requiresTeethSelection: false },
        { name: "تقويم أسنان", defaultPrice: "8000", requiresTeethSelection: false },
        { name: "زراعة سن", defaultPrice: "5000", requiresTeethSelection: true },
        { name: "تركيب طقم أسنان كامل", defaultPrice: "4000", requiresTeethSelection: false },
      ])
      .returning();

    console.log("[AutoSeed] ✓ Added 12 services");

    const s = (partial: string) => allServices.find(x => x.name.includes(partial))!;

    const allPatients = await db
      .insert(patients)
      .values([
        { name: "أحمد محمد العتيبي", phone: "0551234567", age: 35, gender: "male" as const, notes: "يعاني من حساسية البنج" },
        { name: "فاطمة عبدالله الشمري", phone: "0559876543", age: 28, gender: "female" as const },
        { name: "خالد سعود الدوسري", phone: "0543216789", age: 45, gender: "male" as const, notes: "مريض سكري - يحتاج احتياطات خاصة" },
        { name: "نورة حسن القحطاني", phone: "0567891234", age: 22, gender: "female" as const, notes: "حامل في الشهر السادس" },
        { name: "عبدالرحمن سالم المطيري", phone: "0534567890", age: 50, gender: "male" as const, notes: "يتناول أدوية مميعة للدم" },
        { name: "سارة إبراهيم الحربي", phone: "0578901234", age: 30, gender: "female" as const },
        { name: "محمد فهد الغامدي", phone: "0512345678", age: 40, gender: "male" as const, notes: "تاريخ عائلي لأمراض اللثة" },
        { name: "ريم عبدالعزيز الزهراني", phone: "0598765432", age: 18, gender: "female" as const, notes: "أول زيارة للعيادة" },
        { name: "سلطان ناصر العنزي", phone: "0523456789", age: 60, gender: "male" as const, notes: "يحتاج طقم أسنان جزئي" },
        { name: "هند محمد السبيعي", phone: "0545678901", age: 33, gender: "female" as const },
        { name: "عمر يوسف الرشيدي", phone: "0556789012", age: 27, gender: "male" as const },
        { name: "لطيفة خالد البقمي", phone: "0567890123", age: 42, gender: "female" as const, notes: "حساسية من المضادات الحيوية" },
      ])
      .returning();

    console.log("[AutoSeed] ✓ Added 12 patients");

    const p = (i: number) => allPatients[i].id;

    await db.insert(appointments).values([
      { patientId: p(0), doctorName: "د. سامي", date: format(new Date(), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "كشف أولي" },
      { patientId: p(1), doctorName: "د. نورة", date: format(new Date(), "yyyy-MM-dd"), period: "evening" as const, status: "scheduled" as const, notes: "متابعة" },
      { patientId: p(2), doctorName: "د. سامي", date: format(new Date(), "yyyy-MM-dd"), period: "evening" as const, status: "scheduled" as const },
      { patientId: p(3), doctorName: "د. نورة", date: format(subDays(new Date(), -1), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const },
      { patientId: p(4), doctorName: "د. سامي", date: format(subDays(new Date(), -1), "yyyy-MM-dd"), period: "evening" as const, status: "scheduled" as const },
    ]);

    console.log("[AutoSeed] ✓ Added 5 appointments");

    const visitsData = [
      { patientId: p(0), date: format(subDays(new Date(), 8), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "400" },
      { patientId: p(1), date: format(subDays(new Date(), 7), "yyyy-MM-dd"), doctorName: "د. نورة", totalAmount: "250" },
      { patientId: p(2), date: format(subDays(new Date(), 6), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "900" },
      { patientId: p(3), date: format(subDays(new Date(), 5), "yyyy-MM-dd"), doctorName: "د. نورة", totalAmount: "300" },
      { patientId: p(4), date: format(subDays(new Date(), 4), "yyyy-MM-dd"), doctorName: "د. أحمد", totalAmount: "1200" },
      { patientId: p(5), date: format(subDays(new Date(), 3), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "200" },
    ];

    const createdVisits = await db.insert(visits).values(visitsData).returning();
    console.log("[AutoSeed] ✓ Added 6 visits");

    await db.insert(visitItems).values([
      { visitId: createdVisits[0].id, serviceId: s("كشف").id, price: "100", quantity: 1 },
      { visitId: createdVisits[0].id, serviceId: s("تنظيف").id, price: "300", quantity: 1 },
      { visitId: createdVisits[1].id, serviceId: s("حشوة عادية").id, price: "250", quantity: 1, toothNumbers: ["16"], jawType: "single_tooth" },
      { visitId: createdVisits[2].id, serviceId: s("علاج عصب").id, price: "800", quantity: 1, toothNumbers: ["36"], jawType: "single_tooth" },
      { visitId: createdVisits[2].id, serviceId: s("كشف").id, price: "100", quantity: 1 },
      { visitId: createdVisits[3].id, serviceId: s("تنظيف").id, price: "300", quantity: 1 },
      { visitId: createdVisits[4].id, serviceId: s("تلبيسة").id, price: "1200", quantity: 1, toothNumbers: ["21"], jawType: "single_tooth" },
      { visitId: createdVisits[5].id, serviceId: s("خلع سن عادي").id, price: "200", quantity: 1, toothNumbers: ["48"], jawType: "single_tooth" },
    ]);
    console.log("[AutoSeed] ✓ Added 8 visit items");

    const cv = (i: number) => createdVisits[i];
    await db.insert(payments).values([
      { id: randomUUID(), visitId: cv(0).id, date: cv(0).date, amount: "400", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: cv(1).id, date: cv(1).date, amount: "250", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: cv(2).id, date: cv(2).date, amount: "500", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: cv(3).id, date: cv(3).date, amount: "300", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: cv(4).id, date: cv(4).date, amount: "1200", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: cv(5).id, date: cv(5).date, amount: "200", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
    ]);
    console.log("[AutoSeed] ✓ Added 6 payment records");

    await db.insert(expenses).values([
      { title: "إيجار العيادة - شهر فبراير", amount: "15000", date: format(subDays(new Date(), 25), "yyyy-MM-dd"), category: "إيجار", type: "fixed" as const },
      { title: "رواتب الموظفين", amount: "25000", date: format(subDays(new Date(), 20), "yyyy-MM-dd"), category: "رواتب", type: "fixed" as const },
      { title: "مستلزمات طبية", amount: "3500", date: format(subDays(new Date(), 15), "yyyy-MM-dd"), category: "مستلزمات", type: "operational" as const },
      { title: "فاتورة كهرباء", amount: "1200", date: format(subDays(new Date(), 10), "yyyy-MM-dd"), category: "فواتير", type: "fixed" as const },
    ]);

    console.log("[AutoSeed] ✓ Added 4 expenses");
    console.log("[AutoSeed] ✅ Database seeded successfully!");
  } catch (error) {
    console.error("[AutoSeed] ❌ Auto-seed failed:", error);
  }
}
