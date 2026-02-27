import { storage } from "./storage";
import { format, addDays } from "date-fns";

export function startReminderScheduler() {
  async function checkAndCreateReminders() {
    try {
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const appointments = await storage.getAppointmentsByDateRange(tomorrow, tomorrow);

      for (const appointment of appointments) {
        await storage.createReminderLog({
          appointmentId: appointment.id,
          channel: "email",
          status: "pending",
          sentAt: null,
          errorMessage: null,
        });
      }

      if (appointments.length > 0) {
        console.log(`[Scheduler] Created ${appointments.length} reminder(s) for ${tomorrow}`);
      }
    } catch (error) {
      console.error("[Scheduler] Error checking reminders:", error);
    }
  }

  checkAndCreateReminders();

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(checkAndCreateReminders, TWENTY_FOUR_HOURS);

  console.log("[Scheduler] Appointment reminder scheduler started");
}

export async function triggerRemindersManually(): Promise<number> {
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const appointments = await storage.getAppointmentsByDateRange(tomorrow, tomorrow);

  let count = 0;
  for (const appointment of appointments) {
    await storage.createReminderLog({
      appointmentId: appointment.id,
      channel: "email",
      status: "pending",
      sentAt: null,
      errorMessage: null,
    });
    count++;
  }

  return count;
}
