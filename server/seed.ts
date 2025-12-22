import { storage } from "./storage";
import { format, subDays, addDays } from "date-fns";

export async function seedDatabase() {
  try {
    // Create services
    const services = await Promise.all([
      storage.createService({ name: "كشفية", defaultPrice: "50" }),
      storage.createService({ name: "حشو عادي", defaultPrice: "150" }),
      storage.createService({ name: "حشو عصب", defaultPrice: "350" }),
      storage.createService({ name: "خلع", defaultPrice: "100" }),
      storage.createService({ name: "خلع جراحي", defaultPrice: "300" }),
      storage.createService({ name: "تبييض أسنان", defaultPrice: "500" }),
      storage.createService({ name: "تنظيف جير", defaultPrice: "200" }),
    ]);

    // Create patients
    const patients = await Promise.all([
      storage.createPatient({
        name: "أحمد محمد",
        phone: "0501234567",
        age: 30,
        gender: "male",
        notes: "حساسية بنسلين",
      }),
      storage.createPatient({
        name: "سارة علي",
        phone: "0559876543",
        age: 25,
        gender: "female",
      }),
      storage.createPatient({
        name: "خالد عمر",
        phone: "0541112223",
        age: 45,
        gender: "male",
        notes: "سكر",
      }),
      storage.createPatient({
        name: "منى يوسف",
        phone: "0563334445",
        age: 28,
        gender: "female",
      }),
      storage.createPatient({
        name: "ياسر حسن",
        phone: "0509998887",
        age: 12,
        gender: "male",
      }),
    ]);

    // Create appointments
    await Promise.all([
      storage.createAppointment({
        patientId: patients[0].id,
        doctorName: "د. سامي",
        date: format(new Date(), "yyyy-MM-dd"),
        period: "morning",
        status: "scheduled",
      }),
      storage.createAppointment({
        patientId: patients[1].id,
        doctorName: "د. سامي",
        date: format(new Date(), "yyyy-MM-dd"),
        period: "evening",
        status: "scheduled",
      }),
      storage.createAppointment({
        patientId: patients[2].id,
        doctorName: "د. نورة",
        date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        period: "morning",
        status: "scheduled",
      }),
    ]);

    // Create visits with items
    const visit1Items = [
      { serviceId: services[0].id, price: "50" },
      { serviceId: services[6].id, price: "200" },
    ];
    const visit1 = await storage.createVisit(
      {
        patientId: patients[0].id,
        date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
        doctorName: "د. سامي",
        totalAmount: "250",
        paidAmount: "250",
      },
      visit1Items
    );

    const visit2Items = [{ serviceId: services[2].id, price: "350" }];
    await storage.createVisit(
      {
        patientId: patients[3].id,
        date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
        doctorName: "د. نورة",
        totalAmount: "350",
        paidAmount: "100",
        notes: "باقي المبلغ الاسبوع القادم",
      },
      visit2Items
    );

    // Create expenses
    await Promise.all([
      storage.createExpense({
        title: "فواتير كهرباء",
        amount: "450",
        date: format(subDays(new Date(), 10), "yyyy-MM-dd"),
        category: "فواتير",
        type: "fixed",
      }),
      storage.createExpense({
        title: "مواد طبية",
        amount: "1200",
        date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
        category: "مشتريات",
        type: "operational",
      }),
      storage.createExpense({
        title: "سحب شخصي",
        amount: "5000",
        date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
        category: "سحبيات",
        type: "withdrawal",
      }),
    ]);

    return {
      success: true,
      message: "تم ملء قاعدة البيانات بالبيانات التجريبية بنجاح",
      data: {
        servicesCount: services.length,
        patientsCount: patients.length,
      },
    };
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  }
}
