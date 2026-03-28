import { db } from "./db";
import {
  patients,
  services,
  appointments,
  visits,
  visitItems,
  payments,
  expenses,
} from "@shared/schema";
import { format, subDays } from "date-fns";
import { randomUUID } from "crypto";

async function seed() {
  console.log("Seeding database...");

  try {
    await db.delete(payments);
    await db.delete(visitItems);
    await db.delete(visits);
    await db.delete(appointments);
    await db.delete(expenses);
    await db.delete(patients);
    await db.delete(services);

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

    console.log("✓ Added 12 services");

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

    console.log("✓ Added 12 patients");

    const p = (i: number) => allPatients[i].id;

    await db.insert(appointments).values([
      { patientId: p(0), doctorName: "د. سامي", date: format(new Date(), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "كشف أولي" },
      { patientId: p(1), doctorName: "د. نورة", date: format(new Date(), "yyyy-MM-dd"), period: "evening" as const, status: "scheduled" as const, notes: "متابعة" },
      { patientId: p(2), doctorName: "د. سامي", date: format(new Date(), "yyyy-MM-dd"), period: "evening" as const, status: "scheduled" as const, notes: "فحص أولي" },
      { patientId: p(3), doctorName: "د. نورة", date: format(subDays(new Date(), -1), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "متابعة" },
      { patientId: p(4), doctorName: "د. سامي", date: format(subDays(new Date(), -1), "yyyy-MM-dd"), period: "evening" as const, status: "scheduled" as const, notes: "أول زيارة" },
      { patientId: p(5), doctorName: "د. أحمد", date: format(subDays(new Date(), -2), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "متابعة تقويم" },
      { patientId: p(6), doctorName: "د. نورة", date: format(subDays(new Date(), -2), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "تبييض" },
      { patientId: p(7), doctorName: "د. سامي", date: format(subDays(new Date(), -3), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "علاج عصب" },
      { patientId: p(8), doctorName: "د. أحمد", date: format(subDays(new Date(), -3), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "كشف روتيني" },
      { patientId: p(9), doctorName: "د. سامي", date: format(subDays(new Date(), -4), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "متابعة حشوة" },
      { patientId: p(10), doctorName: "د. نورة", date: format(subDays(new Date(), -5), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "تنظيف دوري" },
      { patientId: p(11), doctorName: "د. سامي", date: format(subDays(new Date(), -6), "yyyy-MM-dd"), period: "morning" as const, status: "scheduled" as const, notes: "متابعة حشوة" },
    ]);

    console.log("✓ Added 12 appointments");

    const visitsData = [
      { patientId: p(0), date: format(subDays(new Date(), 8), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "400", notes: "كشف شامل وتنظيف" },
      { patientId: p(1), date: format(subDays(new Date(), 7), "yyyy-MM-dd"), doctorName: "د. نورة", totalAmount: "250", notes: "حشوة عادية سن 16" },
      { patientId: p(2), date: format(subDays(new Date(), 6), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "900", notes: "حاجة لمتابعة بسبب السكري" },
      { patientId: p(3), date: format(subDays(new Date(), 5), "yyyy-MM-dd"), doctorName: "د. نورة", totalAmount: "300", notes: "تنظيف أسنان" },
      { patientId: p(4), date: format(subDays(new Date(), 4), "yyyy-MM-dd"), doctorName: "د. أحمد", totalAmount: "1200", notes: "تلبيسة زيركون سن 21" },
      { patientId: p(5), date: format(subDays(new Date(), 3), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "200", notes: "خلع سن عادي" },
      { patientId: p(6), date: format(subDays(new Date(), 3), "yyyy-MM-dd"), doctorName: "د. نورة", totalAmount: "1500", notes: "تبييض أسنان كامل" },
      { patientId: p(7), date: format(subDays(new Date(), 2), "yyyy-MM-dd"), doctorName: "د. أحمد", totalAmount: "8000", notes: "بدء علاج تقويم - أقساط" },
      { patientId: p(8), date: format(subDays(new Date(), 2), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "4000", notes: "طقم أسنان كامل" },
      { patientId: p(9), date: format(subDays(new Date(), 1), "yyyy-MM-dd"), doctorName: "د. نورة", totalAmount: "400", notes: "حشوة تجميلية سن 11" },
      { patientId: p(10), date: format(subDays(new Date(), 1), "yyyy-MM-dd"), doctorName: "د. أحمد", totalAmount: "600", notes: "كشف أولي مع حشوتين" },
      { patientId: p(11), date: format(new Date(), "yyyy-MM-dd"), doctorName: "د. سامي", totalAmount: "600", notes: "خلع جراحي سن 38" },
    ];

    const createdVisits = await db.insert(visits).values(visitsData).returning();
    console.log("✓ Added 12 visits");

    const itemsData = [
      { visitId: createdVisits[0].id, serviceId: s("كشف").id, price: "100", quantity: 1 },
      { visitId: createdVisits[0].id, serviceId: s("تنظيف").id, price: "300", quantity: 1 },
      { visitId: createdVisits[1].id, serviceId: s("حشوة عادية").id, price: "250", quantity: 1, toothNumbers: ["16"], jawType: "single_tooth" },
      { visitId: createdVisits[2].id, serviceId: s("علاج عصب").id, price: "800", quantity: 1, toothNumbers: ["36"], jawType: "single_tooth" },
      { visitId: createdVisits[2].id, serviceId: s("كشف").id, price: "100", quantity: 1 },
      { visitId: createdVisits[3].id, serviceId: s("تنظيف").id, price: "300", quantity: 1 },
      { visitId: createdVisits[4].id, serviceId: s("تلبيسة").id, price: "1200", quantity: 1, toothNumbers: ["21"], jawType: "single_tooth" },
      { visitId: createdVisits[5].id, serviceId: s("خلع سن عادي").id, price: "200", quantity: 1, toothNumbers: ["48"], jawType: "single_tooth" },
      { visitId: createdVisits[6].id, serviceId: s("تبييض").id, price: "1500", quantity: 1 },
      { visitId: createdVisits[7].id, serviceId: s("تقويم").id, price: "8000", quantity: 1 },
      { visitId: createdVisits[8].id, serviceId: s("طقم").id, price: "4000", quantity: 1 },
      { visitId: createdVisits[9].id, serviceId: s("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["11"], jawType: "single_tooth" },
      { visitId: createdVisits[10].id, serviceId: s("كشف").id, price: "100", quantity: 1 },
      { visitId: createdVisits[10].id, serviceId: s("حشوة عادية").id, price: "250", quantity: 2, toothNumbers: ["14", "15"], jawType: "single_tooth" },
      { visitId: createdVisits[11].id, serviceId: s("خلع سن جراحي").id, price: "500", quantity: 1, toothNumbers: ["38"], jawType: "single_tooth" },
      { visitId: createdVisits[11].id, serviceId: s("كشف").id, price: "100", quantity: 1 },
    ];

    await db.insert(visitItems).values(itemsData);
    console.log("✓ Added 16 visit items");

    const v = (i: number) => createdVisits[i];
    await db.insert(payments).values([
      { id: randomUUID(), visitId: v(0).id, date: v(0).date, amount: "400", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(1).id, date: v(1).date, amount: "250", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(2).id, date: v(2).date, amount: "500", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(3).id, date: v(3).date, amount: "300", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(4).id, date: v(4).date, amount: "1200", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(5).id, date: v(5).date, amount: "200", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(6).id, date: v(6).date, amount: "1500", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(7).id, date: v(7).date, amount: "2000", type: "initial", note: "دفعة أولى - بدء علاج التقويم" },
      { id: randomUUID(), visitId: v(7).id, date: format(subDays(new Date(), 1), "yyyy-MM-dd"), amount: "1000", type: "manual", note: "قسط ثانٍ" },
      { id: randomUUID(), visitId: v(8).id, date: v(8).date, amount: "4000", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(9).id, date: v(9).date, amount: "400", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(10).id, date: v(10).date, amount: "100", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
      { id: randomUUID(), visitId: v(11).id, date: v(11).date, amount: "500", type: "initial", note: "دفعة مقدمة عند إنشاء الزيارة" },
    ]);
    console.log("✓ Added 13 payment records");

    await db.insert(expenses).values([
      { title: "إيجار العيادة - شهر فبراير", amount: "15000", date: format(subDays(new Date(), 25), "yyyy-MM-dd"), category: "إيجار", type: "fixed" as const, notes: "إيجار شهري" },
      { title: "رواتب الموظفين", amount: "25000", date: format(subDays(new Date(), 20), "yyyy-MM-dd"), category: "رواتب", type: "fixed" as const, notes: "3 موظفين" },
      { title: "مستلزمات طبية", amount: "3500", date: format(subDays(new Date(), 15), "yyyy-MM-dd"), category: "مستلزمات", type: "operational" as const, notes: "قفازات ومعقمات وأدوات" },
      { title: "فاتورة كهرباء", amount: "1200", date: format(subDays(new Date(), 10), "yyyy-MM-dd"), category: "فواتير", type: "fixed" as const },
      { title: "صيانة أجهزة", amount: "2000", date: format(subDays(new Date(), 5), "yyyy-MM-dd"), category: "صيانة", type: "operational" as const, notes: "صيانة جهاز الأشعة" },
      { title: "سحب نقدي - د. سامي", amount: "5000", date: format(subDays(new Date(), 3), "yyyy-MM-dd"), category: "سحب شخصي", type: "withdrawal" as const, notes: "سحب شخصي للدكتور" },
      { title: "مواد تبييض أسنان", amount: "4000", date: format(subDays(new Date(), 2), "yyyy-MM-dd"), category: "مستلزمات", type: "operational" as const, notes: "مواد تبييض من الموزع" },
      { title: "تسويق وإعلانات", amount: "1500", date: format(subDays(new Date(), 1), "yyyy-MM-dd"), category: "تسويق", type: "operational" as const, notes: "إعلانات سوشال ميديا" },
    ]);

    console.log("✓ Added 8 expenses");
    console.log("✅ Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
