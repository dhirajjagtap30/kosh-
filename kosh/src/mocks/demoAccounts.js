/* DEMO ONLY — used by the mock API and by the "Demo accounts" helper on the Login pages (mock mode only).
   Real accounts and password checks belong to the Django backend. */
export const DEMO_ACCOUNTS = [
  { id: "sa1", role: "superadmin", name: "Super Admin", email: "superadmin@param.in", username: "superadmin", password: "Super@123", branch_id: 0 },
  { id: "a1", role: "admin",   name: "Institute Admin", branch_id: 1, email: "admin@param.in",   username: "admin",    password: "Admin@123" },
  { id: "s1", branch_id: 1, role: "student", name: "Abhijeet",        email: "student@param.in", username: "abhijeet", password: "Student@123" },
  { id: "pa1", branch_id: 1, role: "parent", name: "Demo Parent",     email: "parent@param.in",  username: "parent",   password: "Parent@123" },
  { id: "t1", branch_id: 1, role: "staff",   name: "Demo Staff",      email: "staff@param.in",   username: "staff",    password: "Staff@123" },
  { id: "t2", branch_id: 1, role: "trainer", name: "Demo Trainer",    email: "trainer@param.in", username: "trainer",  password: "Trainer@123" },
];
