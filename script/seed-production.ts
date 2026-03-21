import { db } from "../server/db";
import {
  patients,
  services,
  appointments,
  visits,
  visitItems,
  expenses,
  expenseCategories,
  payments,
  users,
} from "../shared/schema";
import { format, subDays, addDays } from "date-fns";
import { sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const today = new Date();
const d = (daysAgo: number) => format(subDays(today, daysAgo), "yyyy-MM-dd");
const df = (daysFromNow: number) => format(addDays(today, daysFromNow), "yyyy-MM-dd");

async function seedProduction() {
  console.log("🚀 بدء إضافة البيانات التجريبية الشاملة...\n");

  // ============ CLEAR EXISTING DATA ============
  console.log("🗑️  حذف البيانات القديمة...");
  await db.execute(sql`DELETE FROM reminder_logs`);
  await db.execute(sql`DELETE FROM audit_logs`);
  await db.execute(sql`DELETE FROM payments`);
  await db.execute(sql`DELETE FROM visit_items`);
  await db.execute(sql`DELETE FROM visits`);
  await db.execute(sql`DELETE FROM appointments`);
  await db.execute(sql`DELETE FROM expenses`);
  await db.execute(sql`DELETE FROM expense_categories`);
  await db.execute(sql`DELETE FROM patients`);
  await db.execute(sql`DELETE FROM services`);
  await db.execute(sql`DELETE FROM users`);
  console.log("✓ تم حذف البيانات القديمة\n");

  // ============ USERS ============
  console.log("👤 إضافة المستخدمين...");
  await db.insert(users).values([
    { username: "admin", password: await hashPassword("admin123"), role: "manager" },
    { username: "dr_sami", password: await hashPassword("sami123"), role: "dentist" },
    { username: "dr_noura", password: await hashPassword("noura123"), role: "dentist" },
    { username: "reception", password: await hashPassword("reception123"), role: "receptionist" },
  ]);
  console.log("✓ تم إضافة 4 مستخدمين\n");

  // ============ SERVICES ============
  console.log("🦷 إضافة الخدمات...");
  const allServices = await db
    .insert(services)
    .values([
      { name: "كشف وفحص أولي", defaultPrice: "100", requiresTeethSelection: false },
      { name: "تنظيف الأسنان بالجهاز", defaultPrice: "300", requiresTeethSelection: false },
      { name: "تلميع الأسنان", defaultPrice: "150", requiresTeethSelection: false },
      { name: "حشوة عادية (أمالغم)", defaultPrice: "200", requiresTeethSelection: true },
      { name: "حشوة تجميلية (كمبوزيت)", defaultPrice: "400", requiresTeethSelection: true },
      { name: "خلع سن عادي", defaultPrice: "200", requiresTeethSelection: true },
      { name: "خلع سن جراحي", defaultPrice: "600", requiresTeethSelection: true },
      { name: "خلع ضرس العقل", defaultPrice: "800", requiresTeethSelection: true },
      { name: "علاج عصب (قناة)", defaultPrice: "900", requiresTeethSelection: true },
      { name: "تلبيسة معدنية", defaultPrice: "700", requiresTeethSelection: true },
      { name: "تلبيسة زيركون", defaultPrice: "1400", requiresTeethSelection: true },
      { name: "تلبيسة بورسلين", defaultPrice: "1100", requiresTeethSelection: true },
      { name: "تبييض الأسنان بالليزر", defaultPrice: "2000", requiresTeethSelection: false },
      { name: "تبييض المنزل (جبيرة)", defaultPrice: "1200", requiresTeethSelection: false },
      { name: "تقويم أسنان ثابت", defaultPrice: "9000", requiresTeethSelection: false },
      { name: "تقويم أسنان شفاف (إنفيزالاين)", defaultPrice: "14000", requiresTeethSelection: false },
      { name: "زراعة سن (إمبلانت)", defaultPrice: "5500", requiresTeethSelection: true },
      { name: "طقم أسنان كامل", defaultPrice: "4500", requiresTeethSelection: false },
      { name: "جسر أسنان (3 وحدات)", defaultPrice: "3500", requiresTeethSelection: true },
      { name: "علاج أمراض اللثة", defaultPrice: "500", requiresTeethSelection: false },
      { name: "فلورايد للأطفال", defaultPrice: "100", requiresTeethSelection: false },
      { name: "سد شقوق الأسنان", defaultPrice: "150", requiresTeethSelection: true },
      { name: "حشوة لبية (قبل العصب)", defaultPrice: "350", requiresTeethSelection: true },
    ])
    .returning();
  console.log(`✓ تم إضافة ${allServices.length} خدمة\n`);

  const sv = (partial: string) => allServices.find(x => x.name.includes(partial))!;

  // ============ EXPENSE CATEGORIES ============
  console.log("📂 إضافة تصنيفات المصاريف...");
  await db.insert(expenseCategories).values([
    { name: "إيجار", type: "fixed" },
    { name: "رواتب", type: "fixed" },
    { name: "فواتير كهرباء وماء", type: "fixed" },
    { name: "مستلزمات طبية", type: "operational" },
    { name: "صيانة الأجهزة", type: "operational" },
    { name: "تسويق وإعلان", type: "operational" },
    { name: "مواد تنظيف", type: "operational" },
    { name: "نفقات شخصية", type: "operational" },
  ]);
  console.log("✓ تم إضافة تصنيفات المصاريف\n");

  // ============ PATIENTS ============
  console.log("👥 إضافة المرضى...");
  const allPatients = await db
    .insert(patients)
    .values([
      { name: "أحمد محمد العتيبي", phone: "0551234567", age: 35, gender: "male" as const, notes: "حساسية من مادة البنج المحلي - يحتاج جرعة أعلى" },
      { name: "فاطمة عبدالله الشمري", phone: "0559876543", age: 28, gender: "female" as const, notes: "متابعة تقويم أسنان" },
      { name: "خالد سعود الدوسري", phone: "0543216789", age: 45, gender: "male" as const, notes: "مريض سكري - يحتاج احتياطات خاصة ومتابعة التئام الجروح" },
      { name: "نورة حسن القحطاني", phone: "0567891234", age: 32, gender: "female" as const },
      { name: "عبدالرحمن سالم المطيري", phone: "0534567890", age: 52, gender: "male" as const, notes: "يتناول أسبرين - خطر نزيف عند الخلع" },
      { name: "سارة إبراهيم الحربي", phone: "0578901234", age: 25, gender: "female" as const },
      { name: "محمد فهد الغامدي", phone: "0512345678", age: 40, gender: "male" as const, notes: "تاريخ عائلي لأمراض اللثة" },
      { name: "ريم عبدالعزيز الزهراني", phone: "0598765432", age: 19, gender: "female" as const },
      { name: "سلطان ناصر العنزي", phone: "0523456789", age: 62, gender: "male" as const, notes: "يحتاج طقم أسنان - متابعة" },
      { name: "هند محمد السبيعي", phone: "0545678901", age: 34, gender: "female" as const, notes: "قلق شديد من الأسنان - يحتاج تهدئة" },
      { name: "عمر يوسف الرشيدي", phone: "0556789012", age: 27, gender: "male" as const },
      { name: "لطيفة خالد البقمي", phone: "0567890123", age: 44, gender: "female" as const, notes: "حساسية من البنسلين والأموكسيسيلين" },
      { name: "عبدالله فيصل المالكي", phone: "0501112233", age: 38, gender: "male" as const },
      { name: "منيرة سعد الجهني", phone: "0502223344", age: 29, gender: "female" as const },
      { name: "فيصل عمر البلوي", phone: "0503334455", age: 55, gender: "male" as const, notes: "يرتدي أطراف صناعية - يحتاج طابع قبل التركيب" },
      { name: "دلال راشد العمري", phone: "0504445566", age: 23, gender: "female" as const },
      { name: "يوسف علي الزياني", phone: "0505556677", age: 31, gender: "male" as const },
      { name: "نادية محمد الحازمي", phone: "0506667788", age: 47, gender: "female" as const },
      { name: "طلال عبدالله القرشي", phone: "0507778899", age: 16, gender: "male" as const, notes: "مراهق - مريض تقويم" },
      { name: "رنا حمد السلمي", phone: "0508889900", age: 21, gender: "female" as const },
      { name: "حسن أحمد الشهراني", phone: "0509990011", age: 60, gender: "male" as const, notes: "ضغط دم مرتفع - يأخذ أدوية" },
      { name: "أمل فهد السريحي", phone: "0551110022", age: 36, gender: "female" as const },
      { name: "وليد سلمان الوادعي", phone: "0552221133", age: 42, gender: "male" as const },
      { name: "ليلى ناصر الدغيثر", phone: "0553332244", age: 26, gender: "female" as const },
      { name: "عادل محمد العسيري", phone: "0554443355", age: 48, gender: "male" as const },
    ])
    .returning();
  console.log(`✓ تم إضافة ${allPatients.length} مريضاً\n`);

  const p = (i: number) => allPatients[i].id;

  // ============ APPOINTMENTS ============
  console.log("📅 إضافة المواعيد...");
  await db.insert(appointments).values([
    // Past completed appointments
    { patientId: p(0), doctorName: "د. سامي", date: d(60), period: "morning", status: "completed", notes: "كشف وفحص أولي" },
    { patientId: p(1), doctorName: "د. نورة", date: d(55), period: "morning", status: "completed", notes: "تقييم التقويم" },
    { patientId: p(2), doctorName: "د. سامي", date: d(50), period: "evening", status: "completed" },
    { patientId: p(3), doctorName: "د. نورة", date: d(48), period: "morning", status: "completed" },
    { patientId: p(4), doctorName: "د. سامي", date: d(45), period: "evening", status: "completed", notes: "خلع - احتياطات خاصة" },
    { patientId: p(5), doctorName: "د. نورة", date: d(40), period: "morning", status: "completed" },
    { patientId: p(6), doctorName: "د. سامي", date: d(38), period: "morning", status: "completed", notes: "علاج لثة" },
    { patientId: p(7), doctorName: "د. نورة", date: d(35), period: "evening", status: "completed" },
    { patientId: p(8), doctorName: "د. سامي", date: d(32), period: "morning", status: "completed", notes: "طقم أسنان - جلسة طابع" },
    { patientId: p(9), doctorName: "د. نورة", date: d(30), period: "morning", status: "completed", notes: "جلسة تهدئة قبل الخلع" },
    { patientId: p(10), doctorName: "د. سامي", date: d(28), period: "evening", status: "completed" },
    { patientId: p(11), doctorName: "د. نورة", date: d(25), period: "morning", status: "completed", notes: "حشوة - حساسية دواء" },
    { patientId: p(12), doctorName: "د. سامي", date: d(22), period: "morning", status: "completed" },
    { patientId: p(13), doctorName: "د. نورة", date: d(20), period: "evening", status: "completed" },
    { patientId: p(14), doctorName: "د. سامي", date: d(18), period: "morning", status: "completed" },
    { patientId: p(0), doctorName: "د. سامي", date: d(15), period: "morning", status: "completed", notes: "متابعة" },
    { patientId: p(2), doctorName: "د. سامي", date: d(14), period: "evening", status: "completed" },
    { patientId: p(15), doctorName: "د. نورة", date: d(12), period: "morning", status: "completed" },
    { patientId: p(16), doctorName: "د. سامي", date: d(10), period: "morning", status: "completed" },
    { patientId: p(17), doctorName: "د. نورة", date: d(9), period: "evening", status: "completed" },
    // Cancelled
    { patientId: p(5), doctorName: "د. سامي", date: d(20), period: "morning", status: "cancelled", notes: "إلغاء بسبب سفر" },
    { patientId: p(18), doctorName: "د. نورة", date: d(8), period: "morning", status: "cancelled", notes: "تأجيل" },
    // Today and upcoming
    { patientId: p(19), doctorName: "د. سامي", date: d(0), period: "morning", status: "scheduled", notes: "أول زيارة" },
    { patientId: p(20), doctorName: "د. نورة", date: d(0), period: "morning", status: "scheduled" },
    { patientId: p(21), doctorName: "د. سامي", date: d(0), period: "evening", status: "scheduled" },
    { patientId: p(1), doctorName: "د. نورة", date: d(0), period: "evening", status: "scheduled", notes: "متابعة التقويم" },
    { patientId: p(22), doctorName: "د. سامي", date: df(1), period: "morning", status: "scheduled" },
    { patientId: p(23), doctorName: "د. نورة", date: df(1), period: "evening", status: "scheduled" },
    { patientId: p(3), doctorName: "د. سامي", date: df(2), period: "morning", status: "scheduled", notes: "علاج عصب جلسة 2" },
    { patientId: p(24), doctorName: "د. نورة", date: df(2), period: "evening", status: "scheduled" },
    { patientId: p(6), doctorName: "د. سامي", date: df(3), period: "morning", status: "scheduled", notes: "متابعة اللثة" },
    { patientId: p(9), doctorName: "د. نورة", date: df(4), period: "morning", status: "scheduled" },
    { patientId: p(11), doctorName: "د. سامي", date: df(5), period: "evening", status: "scheduled" },
    { patientId: p(8), doctorName: "د. نورة", date: df(7), period: "morning", status: "scheduled", notes: "تركيب الطقم" },
  ]);
  console.log("✓ تم إضافة المواعيد\n");

  // ============ VISITS ============
  console.log("🏥 إضافة الزيارات العلاجية...");
  const visitsData = [
    // Month 3 ago
    { patientId: p(0), date: d(85), doctorName: "د. سامي", diagnosis: "تسوس متعدد في الأسنان الخلفية", totalAmount: "400", paidAmount: "400", notes: "تم الكشف والتنظيف" },
    { patientId: p(2), date: d(80), doctorName: "د. سامي", diagnosis: "التهاب لب السن في الضرس السادس", totalAmount: "900", paidAmount: "500", notes: "بدء علاج العصب - متابعة مطلوبة" },
    { patientId: p(4), date: d(78), doctorName: "د. سامي", diagnosis: "ضرس عقل مطمور يسبب ألماً", totalAmount: "800", paidAmount: "800", notes: "خلع ضرس العقل السفلي الأيسر بنجاح" },
    { patientId: p(1), date: d(75), doctorName: "د. نورة", diagnosis: "فحص تقويمي أولي", totalAmount: "14000", paidAmount: "3000", notes: "بدء تقويم إنفيزالاين - دفعة أولى" },
    { patientId: p(5), date: d(72), doctorName: "د. نورة", diagnosis: "تسوس في الثنايا الأمامية", totalAmount: "800", paidAmount: "800", notes: "حشوتان تجميليتان" },
    { patientId: p(6), date: d(70), doctorName: "د. سامي", diagnosis: "أمراض اللثة المتقدمة", totalAmount: "1000", paidAmount: "1000", notes: "علاج لثة + تنظيف عميق" },
    { patientId: p(8), date: d(68), doctorName: "د. سامي", diagnosis: "فقدان جميع الأسنان - يحتاج طقم كامل", totalAmount: "4500", paidAmount: "2000", notes: "أخذ الطابع - تركيب لاحق" },
    { patientId: p(3), date: d(65), doctorName: "د. نورة", diagnosis: "كسر في الرحى الأولى العلوية", totalAmount: "1400", paidAmount: "1400", notes: "تلبيسة زيركون" },
    { patientId: p(7), date: d(60), doctorName: "د. نورة", diagnosis: "تراكم جير وتصبغات", totalAmount: "450", paidAmount: "450", notes: "تنظيف + تلميع" },
    { patientId: p(9), date: d(58), doctorName: "د. نورة", diagnosis: "تسوس في الضرس السفلي", totalAmount: "200", paidAmount: "200", notes: "خلع بسيط" },
    // Month 2 ago
    { patientId: p(10), date: d(55), doctorName: "د. سامي", diagnosis: "تسوس متعدد + فحص شامل", totalAmount: "900", paidAmount: "900" },
    { patientId: p(11), date: d(52), doctorName: "د. نورة", diagnosis: "تسوس بين الأسنان", totalAmount: "600", paidAmount: "600", notes: "حشوتان - مراعاة حساسية الدواء" },
    { patientId: p(12), date: d(50), doctorName: "د. سامي", diagnosis: "احتياج تلبيسة بعد علاج عصب سابق", totalAmount: "1400", paidAmount: "700", notes: "دفعة أولى - باقي في الزيارة القادمة" },
    { patientId: p(13), date: d(48), doctorName: "د. نورة", diagnosis: "تسوس بسيط في القواطع", totalAmount: "400", paidAmount: "400" },
    { patientId: p(2), date: d(45), doctorName: "د. سامي", diagnosis: "متابعة علاج العصب - جلسة ثانية", totalAmount: "300", paidAmount: "300", notes: "اكتمل علاج العصب" },
    { patientId: p(14), date: d(42), doctorName: "د. سامي", diagnosis: "طقم أسنان جزئي", totalAmount: "3500", paidAmount: "1500", notes: "جلسة أولى - طابع" },
    { patientId: p(0), date: d(40), doctorName: "د. سامي", diagnosis: "متابعة + حشوة جديدة", totalAmount: "400", paidAmount: "400" },
    { patientId: p(15), date: d(38), doctorName: "د. نورة", diagnosis: "تبييض أسنان بالليزر", totalAmount: "2000", paidAmount: "2000" },
    { patientId: p(16), date: d(35), doctorName: "د. سامي", diagnosis: "تسوس + تنظيف", totalAmount: "500", paidAmount: "500" },
    { patientId: p(17), date: d(33), doctorName: "د. نورة", diagnosis: "زراعة سن في الموضع 36", totalAmount: "5500", paidAmount: "2750", notes: "مرحلة الغرسة - تركيب التاج لاحقاً" },
    { patientId: p(18), date: d(30), doctorName: "د. سامي", diagnosis: "ألم حاد - خراج لثوي", totalAmount: "700", paidAmount: "700", notes: "صرف مضاد حيوي + تصريف الخراج" },
    { patientId: p(1), date: d(28), doctorName: "د. نورة", diagnosis: "متابعة تقويم الأسنان", totalAmount: "0", paidAmount: "0", notes: "جلسة متابعة ضمن باقة التقويم" },
    // Month 1 ago
    { patientId: p(19), date: d(25), doctorName: "د. سامي", diagnosis: "فحص أولي + تنظيف", totalAmount: "400", paidAmount: "400" },
    { patientId: p(20), date: d(22), doctorName: "د. سامي", diagnosis: "علاج عصب الضرس السابع", totalAmount: "900", paidAmount: "450", notes: "جلسة أولى - يكمل الباقي" },
    { patientId: p(8), date: d(20), doctorName: "د. سامي", diagnosis: "تركيب الطقم الكامل", totalAmount: "0", paidAmount: "0", notes: "اكتمل التركيب - المريض سعيد جداً" },
    { patientId: p(21), date: d(18), doctorName: "د. نورة", diagnosis: "تسوس في رحى الأطفال", totalAmount: "300", paidAmount: "300", notes: "طفل - تم تهدئته جيداً" },
    { patientId: p(12), date: d(16), doctorName: "د. سامي", diagnosis: "اكتمال تلبيسة الزيركون", totalAmount: "700", paidAmount: "700", notes: "تركيب نهائي - رضا تام" },
    { patientId: p(22), date: d(14), doctorName: "د. سامي", diagnosis: "خلع + زراعة فورية", totalAmount: "5700", paidAmount: "3000" },
    { patientId: p(4), date: d(12), doctorName: "د. سامي", diagnosis: "متابعة الجرح بعد الخلع", totalAmount: "100", paidAmount: "100", notes: "التئام جيد" },
    { patientId: p(23), date: d(10), doctorName: "د. نورة", diagnosis: "تصحيح ابتسامة - قشور بورسلين", totalAmount: "6600", paidAmount: "3300", notes: "6 قشور أمامية - دفعة أولى" },
    { patientId: p(6), date: d(8), doctorName: "د. سامي", diagnosis: "متابعة علاج اللثة", totalAmount: "300", paidAmount: "300" },
    { patientId: p(24), date: d(6), doctorName: "د. نورة", diagnosis: "تسوس + فحص", totalAmount: "500", paidAmount: "500" },
    { patientId: p(11), date: d(5), doctorName: "د. نورة", diagnosis: "متابعة الحشوات السابقة", totalAmount: "100", paidAmount: "100" },
    { patientId: p(14), date: d(4), doctorName: "د. سامي", diagnosis: "تجهيز الطقم الجزئي", totalAmount: "2000", paidAmount: "2000", notes: "تركيب مؤقت" },
    { patientId: p(17), date: d(3), doctorName: "د. نورة", diagnosis: "متابعة الزراعة - تركيب تاج", totalAmount: "1400", paidAmount: "1400", notes: "اكتملت الزراعة" },
    { patientId: p(0), date: d(2), doctorName: "د. سامي", diagnosis: "تنظيف دوري", totalAmount: "300", paidAmount: "300" },
    { patientId: p(20), date: d(1), doctorName: "د. سامي", diagnosis: "اكتمال علاج العصب + حشوة", totalAmount: "650", paidAmount: "650", notes: "انتهى العلاج بنجاح" },
  ];

  const createdVisits = await db.insert(visits).values(visitsData).returning();
  console.log(`✓ تم إضافة ${createdVisits.length} زيارة علاجية\n`);

  // ============ VISIT ITEMS ============
  console.log("💊 إضافة بنود الزيارات...");
  await db.insert(visitItems).values([
    // Visit 0: كشف + تنظيف
    { visitId: createdVisits[0].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[0].id, serviceId: sv("تنظيف").id, price: "300", quantity: 1 },
    // Visit 1: علاج عصب
    { visitId: createdVisits[1].id, serviceId: sv("علاج عصب").id, price: "900", quantity: 1, toothNumbers: ["36"], jawType: "single_tooth" },
    // Visit 2: خلع ضرس عقل
    { visitId: createdVisits[2].id, serviceId: sv("خلع ضرس").id, price: "800", quantity: 1, toothNumbers: ["38"], jawType: "single_tooth" },
    // Visit 3: تقويم إنفيزالاين
    { visitId: createdVisits[3].id, serviceId: sv("إنفيزالاين").id, price: "14000", quantity: 1 },
    // Visit 4: حشوتان تجميليتان
    { visitId: createdVisits[4].id, serviceId: sv("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["11"], jawType: "single_tooth" },
    { visitId: createdVisits[4].id, serviceId: sv("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["21"], jawType: "single_tooth" },
    // Visit 5: علاج لثة + تنظيف
    { visitId: createdVisits[5].id, serviceId: sv("أمراض اللثة").id, price: "500", quantity: 1 },
    { visitId: createdVisits[5].id, serviceId: sv("تنظيف").id, price: "300", quantity: 1 },
    { visitId: createdVisits[5].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    // Visit 6: طقم كامل
    { visitId: createdVisits[6].id, serviceId: sv("طقم").id, price: "4500", quantity: 1 },
    // Visit 7: تلبيسة زيركون
    { visitId: createdVisits[7].id, serviceId: sv("زيركون").id, price: "1400", quantity: 1, toothNumbers: ["16"], jawType: "single_tooth" },
    // Visit 8: تنظيف + تلميع
    { visitId: createdVisits[8].id, serviceId: sv("تنظيف").id, price: "300", quantity: 1 },
    { visitId: createdVisits[8].id, serviceId: sv("تلميع").id, price: "150", quantity: 1 },
    // Visit 9: خلع عادي
    { visitId: createdVisits[9].id, serviceId: sv("خلع سن عادي").id, price: "200", quantity: 1, toothNumbers: ["46"], jawType: "single_tooth" },
    // Visit 10: كشف + تنظيف + حشوة
    { visitId: createdVisits[10].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[10].id, serviceId: sv("تنظيف").id, price: "300", quantity: 1 },
    { visitId: createdVisits[10].id, serviceId: sv("حشوة عادية").id, price: "200", quantity: 2, toothNumbers: ["26", "27"], jawType: "single_tooth" },
    // Visit 11: حشوتان تجميليتان
    { visitId: createdVisits[11].id, serviceId: sv("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["15"], jawType: "single_tooth" },
    { visitId: createdVisits[11].id, serviceId: sv("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["25"], jawType: "single_tooth" },
    // Visit 12: تلبيسة زيركون
    { visitId: createdVisits[12].id, serviceId: sv("زيركون").id, price: "1400", quantity: 1, toothNumbers: ["46"], jawType: "single_tooth" },
    // Visit 13: حشوتان
    { visitId: createdVisits[13].id, serviceId: sv("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["12"], jawType: "single_tooth" },
    // Visit 14: متابعة علاج عصب
    { visitId: createdVisits[14].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[14].id, serviceId: sv("حشوة لبية").id, price: "350", quantity: 1, toothNumbers: ["36"], jawType: "single_tooth" },
    // Visit 15: جسر أسنان
    { visitId: createdVisits[15].id, serviceId: sv("جسر").id, price: "3500", quantity: 1, toothNumbers: ["44", "45", "46"], jawType: "single_tooth" },
    // Visit 16: كشف + حشوة
    { visitId: createdVisits[16].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[16].id, serviceId: sv("حشوة عادية").id, price: "200", quantity: 1, toothNumbers: ["37"], jawType: "single_tooth" },
    // Visit 17: تبييض
    { visitId: createdVisits[17].id, serviceId: sv("ليزر").id, price: "2000", quantity: 1 },
    // Visit 18: كشف + تنظيف + حشوة
    { visitId: createdVisits[18].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[18].id, serviceId: sv("تنظيف").id, price: "300", quantity: 1 },
    { visitId: createdVisits[18].id, serviceId: sv("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["22"], jawType: "single_tooth" },
    // Visit 19: زراعة
    { visitId: createdVisits[19].id, serviceId: sv("زراعة").id, price: "5500", quantity: 1, toothNumbers: ["36"], jawType: "single_tooth" },
    // Visit 20: خراج
    { visitId: createdVisits[20].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[20].id, serviceId: sv("خلع سن عادي").id, price: "200", quantity: 1, toothNumbers: ["47"], jawType: "single_tooth" },
    { visitId: createdVisits[20].id, serviceId: sv("أمراض اللثة").id, price: "500", quantity: 1 },
    // Visit 21: متابعة تقويم
    { visitId: createdVisits[21].id, serviceId: sv("كشف").id, price: "0", quantity: 1 },
    // Visit 22: كشف + تنظيف
    { visitId: createdVisits[22].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[22].id, serviceId: sv("تنظيف").id, price: "300", quantity: 1 },
    // Visit 23: علاج عصب
    { visitId: createdVisits[23].id, serviceId: sv("علاج عصب").id, price: "900", quantity: 1, toothNumbers: ["47"], jawType: "single_tooth" },
    // Visit 24: تركيب طقم (متابعة)
    { visitId: createdVisits[24].id, serviceId: sv("كشف").id, price: "0", quantity: 1 },
    // Visit 25: حشوة لبية طفل
    { visitId: createdVisits[25].id, serviceId: sv("حشوة لبية").id, price: "350", quantity: 1, toothNumbers: ["54"], jawType: "single_tooth" },
    // Visit 26: تلبيسة زيركون نهائية
    { visitId: createdVisits[26].id, serviceId: sv("زيركون").id, price: "700", quantity: 1, toothNumbers: ["46"], jawType: "single_tooth" },
    // Visit 27: زراعة + خلع فوري
    { visitId: createdVisits[27].id, serviceId: sv("خلع سن جراحي").id, price: "600", quantity: 1, toothNumbers: ["14"], jawType: "single_tooth" },
    { visitId: createdVisits[27].id, serviceId: sv("زراعة").id, price: "5500", quantity: 1, toothNumbers: ["14"], jawType: "single_tooth" },
    // Visit 28: متابعة جرح
    { visitId: createdVisits[28].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    // Visit 29: قشور بورسلين
    { visitId: createdVisits[29].id, serviceId: sv("بورسلين").id, price: "1100", quantity: 6, toothNumbers: ["13", "12", "11", "21", "22", "23"], jawType: "single_tooth" },
    // Visit 30: متابعة لثة
    { visitId: createdVisits[30].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[30].id, serviceId: sv("أمراض اللثة").id, price: "200", quantity: 1 },
    // Visit 31: حشوة + كشف
    { visitId: createdVisits[31].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[31].id, serviceId: sv("تجميلية").id, price: "400", quantity: 1, toothNumbers: ["11"], jawType: "single_tooth" },
    // Visit 32: متابعة حشوات
    { visitId: createdVisits[32].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    // Visit 33: جسر جزئي
    { visitId: createdVisits[33].id, serviceId: sv("كشف").id, price: "100", quantity: 1 },
    { visitId: createdVisits[33].id, serviceId: sv("تلبيسة معدنية").id, price: "700", quantity: 1, toothNumbers: ["45"], jawType: "single_tooth" },
    // Visit 34: اكتمال الزراعة
    { visitId: createdVisits[34].id, serviceId: sv("زيركون").id, price: "1400", quantity: 1, toothNumbers: ["36"], jawType: "single_tooth" },
    // Visit 35: تنظيف دوري
    { visitId: createdVisits[35].id, serviceId: sv("تنظيف").id, price: "300", quantity: 1 },
    // Visit 36: اكتمال علاج عصب + حشوة
    { visitId: createdVisits[36].id, serviceId: sv("حشوة لبية").id, price: "350", quantity: 1, toothNumbers: ["47"], jawType: "single_tooth" },
    { visitId: createdVisits[36].id, serviceId: sv("حشوة عادية").id, price: "200", quantity: 1, toothNumbers: ["47"], jawType: "single_tooth" },
  ]);
  console.log("✓ تم إضافة بنود الزيارات\n");

  // ============ PAYMENTS (for partial payments) ============
  console.log("💰 إضافة دفعات المدفوعات...");
  // Find visits with remaining balance
  await db.insert(payments).values([
    // Visit 1 (علاج عصب) - paid 500 of 900
    { visitId: createdVisits[1].id, date: d(80), amount: "500", note: "دفعة أولى" },
    // Visit 3 (تقويم) - paid 3000 of 14000
    { visitId: createdVisits[3].id, date: d(75), amount: "3000", note: "دفعة تسجيل التقويم" },
    // Visit 6 (طقم كامل) - paid 2000 of 4500
    { visitId: createdVisits[6].id, date: d(68), amount: "2000", note: "دفعة أولى - تجهيز الطقم" },
    // Visit 12 (تلبيسة 1400) - paid 700
    { visitId: createdVisits[12].id, date: d(50), amount: "700", note: "دفعة مقدمة" },
    // Visit 15 (جسر 3500) - paid 1500
    { visitId: createdVisits[15].id, date: d(42), amount: "1500", note: "دفعة أولى للجسر" },
    // Visit 19 (زراعة 5500) - paid 2750
    { visitId: createdVisits[19].id, date: d(33), amount: "2750", note: "نصف التكلفة عند التركيب" },
    // Visit 23 (علاج عصب 900) - paid 450
    { visitId: createdVisits[23].id, date: d(22), amount: "450", note: "دفعة أولى" },
    // Visit 27 (زراعة 5700) - paid 3000
    { visitId: createdVisits[27].id, date: d(14), amount: "3000", note: "مقدم عند الخلع والزراعة" },
    // Visit 29 (قشور 6600) - paid 3300
    { visitId: createdVisits[29].id, date: d(10), amount: "3300", note: "50% مقدم" },
  ]);
  console.log("✓ تم إضافة الدفعات\n");

  // ============ EXPENSES ============
  console.log("💸 إضافة المصاريف...");
  await db.insert(expenses).values([
    // 3 months ago
    { title: "إيجار العيادة - الشهر الأول", amount: "18000", date: d(90), category: "إيجار", type: "fixed" },
    { title: "رواتب الموظفين - الشهر الأول", amount: "32000", date: d(88), category: "رواتب", type: "fixed" },
    { title: "مستلزمات طبية وأدوات", amount: "4200", date: d(85), category: "مستلزمات طبية", type: "operational" },
    { title: "فاتورة كهرباء", amount: "1800", date: d(82), category: "فواتير كهرباء وماء", type: "fixed" },
    { title: "صيانة كرسي الأسنان", amount: "2500", date: d(78), category: "صيانة الأجهزة", type: "operational" },
    { title: "إعلان على وسائل التواصل", amount: "1500", date: d(75), category: "تسويق وإعلان", type: "operational" },
    { title: "مواد تنظيف وتعقيم", amount: "600", date: d(72), category: "مواد تنظيف", type: "operational" },
    // 2 months ago
    { title: "إيجار العيادة - الشهر الثاني", amount: "18000", date: d(60), category: "إيجار", type: "fixed" },
    { title: "رواتب الموظفين - الشهر الثاني", amount: "32000", date: d(58), category: "رواتب", type: "fixed" },
    { title: "مواد طب أسنان (راتنج، مواد حشو)", amount: "3800", date: d(55), category: "مستلزمات طبية", type: "operational" },
    { title: "فاتورة كهرباء", amount: "2100", date: d(52), category: "فواتير كهرباء وماء", type: "fixed" },
    { title: "فاتورة إنترنت وهاتف", amount: "350", date: d(50), category: "فواتير كهرباء وماء", type: "fixed" },
    { title: "شراء قفازات وكمامات", amount: "800", date: d(48), category: "مستلزمات طبية", type: "operational" },
    { title: "صيانة جهاز الأشعة", amount: "1200", date: d(45), category: "صيانة الأجهزة", type: "operational" },
    { title: "سحب شخصي - الدكتور", amount: "10000", date: d(42), category: "نفقات شخصية", type: "withdrawal" as const },
    { title: "مواد تنظيف", amount: "500", date: d(40), category: "مواد تنظيف", type: "operational" },
    // Last month
    { title: "إيجار العيادة - الشهر الثالث", amount: "18000", date: d(30), category: "إيجار", type: "fixed" },
    { title: "رواتب الموظفين - الشهر الثالث", amount: "32000", date: d(28), category: "رواتب", type: "fixed" },
    { title: "مستلزمات طبية متنوعة", amount: "5100", date: d(25), category: "مستلزمات طبية", type: "operational" },
    { title: "فاتورة كهرباء", amount: "1950", date: d(22), category: "فواتير كهرباء وماء", type: "fixed" },
    { title: "تجديد لافتة العيادة", amount: "900", date: d(20), category: "تسويق وإعلان", type: "operational" },
    { title: "شراء كميات حشوة تجميلية", amount: "2800", date: d(18), category: "مستلزمات طبية", type: "operational" },
    { title: "مواد تعقيم اضافية", amount: "700", date: d(15), category: "مواد تنظيف", type: "operational" },
    { title: "صيانة مكيفات العيادة", amount: "1600", date: d(12), category: "صيانة الأجهزة", type: "operational" },
    { title: "سحب شخصي - الدكتور", amount: "12000", date: d(10), category: "نفقات شخصية", type: "withdrawal" as const },
    { title: "فاتورة إنترنت", amount: "350", date: d(8), category: "فواتير كهرباء وماء", type: "fixed" },
    { title: "طباعة بطاقات العيادة", amount: "400", date: d(5), category: "تسويق وإعلان", type: "operational" },
    { title: "أدوات وغيار طبي", amount: "1900", date: d(3), category: "مستلزمات طبية", type: "operational" },
  ]);
  console.log("✓ تم إضافة المصاريف\n");

  console.log("🎉 تمت إضافة جميع البيانات بنجاح!");
  console.log("\n📊 ملخص البيانات المضافة:");
  console.log("  - 4 مستخدمين (مدير + طبيبين + موظف استقبال)");
  console.log("  - 23 خدمة طبية");
  console.log("  - 25 مريضاً");
  console.log("  - 33 موعداً (منجز + مجدول + ملغى)");
  console.log("  - 37 زيارة علاجية");
  console.log("  - بنود خدمات مفصّلة لكل زيارة");
  console.log("  - دفعات متعددة للمدفوعات الجزئية");
  console.log("  - 28 مصروفاً لمدة 3 أشهر");
  console.log("\n🔑 بيانات تسجيل الدخول:");
  console.log("  - المدير:    admin / admin123");
  console.log("  - د. سامي:  dr_sami / sami123");
  console.log("  - د. نورة:  dr_noura / noura123");
  console.log("  - الاستقبال: reception / reception123");
}

seedProduction().catch(console.error).finally(() => process.exit(0));
