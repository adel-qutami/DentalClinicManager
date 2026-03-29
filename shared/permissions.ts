export type Role = "receptionist" | "dentist" | "manager" | "doctor";

export const PERMISSIONS = {
  patients_view: ["receptionist", "dentist", "manager", "doctor"],
  patients_manage: ["receptionist", "manager"],

  appointments_view: ["receptionist", "dentist", "manager", "doctor"],
  appointments_manage: ["receptionist", "manager", "doctor"],

  visits_view: ["receptionist", "dentist", "manager", "doctor"],
  visits_create: ["receptionist", "manager", "doctor"],
  visits_edit: ["dentist", "manager", "doctor"],

  services_view: ["receptionist", "dentist", "manager", "doctor"],
  services_manage: ["manager"],
  services_price_edit: ["manager"],

  finance_view: ["manager"],
  finance_manage: ["manager"],

  expenses_view: ["manager"],
  expenses_manage: ["manager"],

  payments_create: ["receptionist", "manager", "doctor"],

  users_manage: ["manager"],

  audit_view: ["manager"],

  reports_view: ["manager"],
  reports_export: ["manager"],

  tooth_history_view: ["dentist", "manager", "doctor"],
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
    doctor: "طبيب",
  };
  return labels[role] ?? role;
}

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];
