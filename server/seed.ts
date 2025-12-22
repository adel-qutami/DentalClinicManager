import { db } from "./db";
import {
  patients,
  services,
  appointments,
  visits,
  visitItems,
  expenses,
} from "@shared/schema";
import { format, subDays } from "date-fns";

async function seed() {
  console.log("Seeding database...");

  try {
    // Clear existing data
    await db.delete(visitItems);
    await db.delete(visits);
    await db.delete(appointments);
    await db.delete(expenses);
    await db.delete(patients);
    await db.delete(services);

    // Add services
    const [service1, service2, service3, service4, service5, service6, service7] =
      await db
        .insert(services)
        .values([
          { name: "كشفية", defaultPrice: "50" },
          { name: "حشو عادي", defaultPrice: "150" },
          { name: "حشو عصب", defaultPrice: "350" },
          { name: "خلع", defaultPrice: "100" },
          { name: "خلع جراحي", defaultPrice: "300" },
          { name: "تبييض أسنان", defaultPrice: "500" },
          { name: "تنظيف جير", defaultPrice: "200" },
        ])
        .returning();

    console.log("✓ Added 7 services");

    // Add patients
    const [patient1, patient2, patient3, patient4, patient5] = await db
      .insert(patients)
      .values([
        {
          name: "أحمد محمد",
          phone: "0501234567",
          age: 30,
          gender: "male",
          notes: "حساسية بنسلين",
        },
        {
          name: "سارة علي",
          phone: "0559876543",
          age: 25,
          gender: "female",
        },
        {
          name: "خالد عمر",
          phone: "0541112223",
          age: 45,
          gender: "male",
          notes: "سكر",
        },
        {
          name: "منى يوسف",
          phone: "0563334445",
          age: 28,
          gender: "female",
        },
        {
          name: "ياسر حسن",
          phone: "0509998887",
          age: 12,
          gender: "male",
        },
      ])
      .returning();

    console.log("✓ Added 5 patients");

    // Add appointments
    await db.insert(appointments).values([
      {
        patientId: patient1.id,
        doctorName: "د. سامي",
        date: format(new Date(), "yyyy-MM-dd"),
        period: "morning",
        status: "scheduled",
      },
      {
        patientId: patient2.id,
        doctorName: "د. سامي",
        date: format(new Date(), "yyyy-MM-dd"),
        period: "evening",
        status: "scheduled",
      },
      {
        patientId: patient3.id,
        doctorName: "د. نورة",
        date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"),
        period: "morning",
        status: "scheduled",
      },
    ]);

    console.log("✓ Added 3 appointments");

    // Add visits with items
    const [visit1, visit2] = await db
      .insert(visits)
      .values([
        {
          patientId: patient1.id,
          date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
          doctorName: "د. سامي",
          totalAmount: "250",
          paidAmount: "250",
        },
        {
          patientId: patient4.id,
          date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
          doctorName: "د. نورة",
          totalAmount: "350",
          paidAmount: "100",
          notes: "باقي المبلغ الاسبوع القادم",
        },
      ])
      .returning();

    // Add visit items
    await db.insert(visitItems).values([
      { visitId: visit1.id, serviceId: service1.id, price: "50" },
      { visitId: visit1.id, serviceId: service7.id, price: "200" },
      { visitId: visit2.id, serviceId: service3.id, price: "350" },
    ]);

    console.log("✓ Added 2 visits with items");

    // Add expenses
    await db.insert(expenses).values([
      {
        title: "فواتير كهرباء",
        amount: "450",
        date: format(subDays(new Date(), 10), "yyyy-MM-dd"),
        category: "فواتير",
        type: "fixed",
      },
      {
        title: "مواد طبية",
        amount: "1200",
        date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
        category: "مشتريات",
        type: "operational",
      },
      {
        title: "سحب شخصي",
        amount: "5000",
        date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
        category: "سحبيات",
        type: "withdrawal",
      },
    ]);

    console.log("✓ Added 3 expenses");
    console.log("✅ Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
