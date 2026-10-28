/* Where each role lands after login. Demo accounts live in src/mocks/demoAccounts.js;
   real authentication is done by the backend through src/services/authService.js. */
export const ROLE_HOME = { superadmin: "/dashboard/branches", admin: "/dashboard", staff: "/dashboard", trainer: "/dashboard", student: "/student-dashboard", parent: "/parent-dashboard" };
export const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", staff: "Staff", trainer: "Trainer", student: "Student", parent: "Parent" };
export const DASHBOARD_ROLES = ["superadmin", "admin", "staff", "trainer"];
export const LOGIN_PATH = "/login";

/* Separate login page for every kind of user. `roles` = who may sign in on that page. */
export const PORTALS = {
  admin:   { path: "/admin-login",   label: "Admin",            icon: "🛡️", roles: ["admin", "superadmin"], sub: "Institute / branch administrators and the super admin." },
  student: { path: "/student-login", label: "Student",          icon: "🎓", roles: ["student"],          sub: "Use the ID and password you chose while registering." },
  parent:  { path: "/parent-login",  label: "Parent",           icon: "👨‍👩‍👧", roles: ["parent"],           sub: "Use the parent ID and password given by the institute." },
  staff:   { path: "/staff-login",   label: "Staff / Trainer",  icon: "👥", roles: ["staff", "trainer"], sub: "Use the ID and password created by the admin." },
};
