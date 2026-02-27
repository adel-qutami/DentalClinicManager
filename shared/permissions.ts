export type Role = "receptionist" | "dentist" | "manager";

export const PERMISSIONS = {
  patients_view: ["receptionist", "dentist", "manager"],
  patients_manage: ["receptionist", "manager"],

  appointments_view: ["receptionist", "dentist", "manager"],
  appointments_manage: ["receptionist", "manager"],

  visits_view: ["receptionist", "dentist", "manager"],
  visits_create: ["receptionist", "manager"],
  visits_edit: ["dentist", "manager"],

  services_view: ["receptionist", "dentist", "manager"],
  services_manage: ["manager"],
  services_price_edit: ["manager"],

  finance_view: ["manager"],
  finance_manage: ["manager"],

  expenses_view: ["manager"],
  expenses_manage: ["manager"],

  payments_create: ["receptionist", "manager"],

  users_manage: ["manager"],

  audit_view: ["manager"],

  reports_view: ["manager"],
  reports_export: ["manager"],

  reminders_view: ["receptionist", "manager"],
  reminders_manage: ["manager"],

  tooth_history_view: ["dentist", "manager"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    receptionist: "موظف استقبال",
    dentist: "طبيب أسنان",
    manager: "مدير العيادة",
  };
  return labels[role];
}
