/**
 * Role-Based Access Control (RBAC) definitions.
 *
 * NOTE: This is a client-side demonstration of access-control patterns.
 * In a production clinical system these checks MUST also be enforced by a
 * backend service — client-side checks alone are never sufficient to protect
 * sensitive patient data (PHI). Patient identifiers here are protected under
 * patient-privacy regulations (e.g. UU Pelindungan Data Pribadi / HIPAA).
 */

export type Role = "public" | "admin" | "medis" | "petugas";

export type Permission =
  | "view_dashboard"
  | "view_patient_list"
  | "view_patient_pii"
  | "view_patient_detail"
  | "view_analytics"
  | "export_data";

export interface RoleDef {
  key: Role;
  label: string;
  short: string;
  description: string;
  permissions: Permission[];
  color: string;
}

export const ROLES: Record<Role, RoleDef> = {
  public: {
    key: "public",
    label: "Akses Publik",
    short: "Publik",
    description:
      "Akses publik tanpa login. Hanya dapat melihat ringkasan statistik dan analitik agregat. Data pasien tidak dapat diakses.",
    permissions: ["view_dashboard", "view_analytics"],
    color: "#64748b",
  },
  admin: {
    key: "admin",
    label: "Administrator RS",
    short: "Admin",
    description: "Akses penuh ke seluruh data pasien dan fitur sistem.",
    permissions: [
      "view_dashboard",
      "view_patient_list",
      "view_patient_pii",
      "view_patient_detail",
      "view_analytics",
      "export_data",
    ],
    color: "#7c3aed",
  },
  medis: {
    key: "medis",
    label: "Tim Medis / Perawat",
    short: "Medis",
    description: "Akses data pasien, detail klinis, dan analitik rumah sakit.",
    permissions: [
      "view_dashboard",
      "view_patient_list",
      "view_patient_pii",
      "view_patient_detail",
      "view_analytics",
    ],
    color: "#0ea5e9",
  },
  petugas: {
    key: "petugas",
    label: "Petugas Rekam Medis",
    short: "Petugas",
    description:
      "Akses terbatas. Data pribadi pasien (PII) otomatis disamarkan demi privasi.",
    permissions: [
      "view_dashboard",
      "view_patient_list",
      "view_patient_detail",
      "view_analytics",
      "export_data",
    ],
    color: "#10b981",
  },
};

export function can(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLES[role].permissions.includes(permission);
}

export function roleLabel(role: Role | null): string {
  return role ? ROLES[role].label : "Tidak login";
}
