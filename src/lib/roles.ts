export type AppRole =
  | "student"
  | "parent"
  | "teacher"
  | "school_admin"
  | "super_admin";

export const AllRoles: AppRole[] = [
  "student",
  "parent",
  "teacher",
  "school_admin",
  "super_admin",
];

// High-level permission flags used across the app
export type Permission =
  | "read_self"
  | "write_self"
  | "read_school"
  | "write_school"
  | "assign_roles"
  | "admin_all";

export const RolePermissions: Record<AppRole, Permission[]> = {
  student: ["read_self", "write_self"],
  parent: ["read_self"],
  teacher: ["read_school", "write_school"],
  school_admin: ["read_school", "write_school", "assign_roles"],
  super_admin: ["admin_all", "assign_roles"],
};

export const hasPermission = (role: AppRole | undefined, perm: Permission) => {
  if (!role) return false;
  const perms = RolePermissions[role] || [];
  return perms.includes(perm) || perms.includes("admin_all");
};

// Utility guards for convenience
export const canAssignRoles = (role?: AppRole) => hasPermission(role, "assign_roles");
export const canAdminAll = (role?: AppRole) => hasPermission(role, "admin_all");