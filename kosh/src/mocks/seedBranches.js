/* DEMO ONLY: sample branches (each one a white-label brand) + one demo student and one branch admin per extra branch.
   Everything that existed before (students, tests, batches, courses...) is assigned to branch 1 so nothing is lost. */
export const BRANCH_SEED = [
  { id: 1, code: "nashik", name: "Nashik (Main Branch)", city: "Nashik", address: "College Road, Nashik", phone: "0253 2000001", email: "nashik@param.in", brand_name: "Sahyadri", institute_name: "Sahyadri Easy Coaching", tagline: "EASY COACHING • JEE • NEET • MHT-CET", logo: "/logo.png", primary_color: "#2563eb", dark_color: "#0a2463", domain: "", status: "Active" },
  { id: 2, code: "pune", name: "Pune Branch", city: "Pune", address: "FC Road, Pune", phone: "020 2000002", email: "pune@param.in", brand_name: "Shivneri", institute_name: "Shivneri Academy", tagline: "SCIENCE ACADEMY • NEET • JEE", logo: "", primary_color: "#059669", dark_color: "#064e3b", domain: "shivneri.example.com", status: "Active" },
  { id: 3, code: "mumbai", name: "Mumbai Branch", city: "Mumbai", address: "Dadar, Mumbai", phone: "022 2000003", email: "mumbai@param.in", brand_name: "Konkan Scholars", institute_name: "Konkan Scholars Institute", tagline: "MHT-CET • BOARDS • FOUNDATION", logo: "", primary_color: "#7c3aed", dark_color: "#3b0764", domain: "konkan.example.com", status: "Active" },
];
const OWNED = ["registrations", "staff", "parents", "batches", "tests", "materials", "courses", "students"];

export function seedBranches(db) {
  if (db.branchesSeeded) return false;
  db.branches = BRANCH_SEED.map((b) => ({ ...b }));
  OWNED.forEach((k) => (db[k] || []).forEach((x) => { if (!x.branch_id) x.branch_id = 1; }));
  let cid = db.courses.reduce((m, c) => Math.max(m, c.id), 0);
  const base = db.courses.filter((c) => c.branch_id === 1);
  [2, 3].forEach((b) => base.forEach((c) => db.courses.push({ ...c, id: ++cid, branch_id: b, lessons: c.lessons.map((l) => ({ ...l })) })));
  let rid = db.registrations.reduce((m, r) => Math.max(m, r.id), 0);
  [["Sakshi Bhosale", "12th", "NEET", 2], ["Pooja Chavan", "10th", "", 2], ["Rahul Naik", "11th", "JEE (Main)", 3], ["Yash Mhatre", "9th", "", 3]].forEach(([name, standard, target, branch_id], i) => {
    const username = name.split(" ")[0].toLowerCase();
    if (db.registrations.some((r) => r.username === username)) return;
    db.registrations.push({ id: ++rid, name, mobile: `98900${40000 + i * 113}`, standard, target, medium: "English", date_of_birth: "2010-04-1" + i, email: `${username}@example.com`, parent_name: `${name.split(" ")[1]} (Parent)`, parent_mobile: `99900${50000 + i * 71}`, school_name: "City High School", username, password: "Student@123", status: "Active", registered_on: "2026-10-27", branch_id });
  });
  let sid = db.staff.reduce((m, s) => Math.max(m, s.id), 0);
  [["Pune Branch Admin", "pune", 2], ["Mumbai Branch Admin", "mumbai", 3]].forEach(([name, key, branch_id]) => {
    if (!db.staff.some((s) => s.username === `admin.${key}`)) db.staff.push({ id: ++sid, name, role: "admin", mobile: "9000000000", email: `admin.${key}@param.in`, username: `admin.${key}`, password: "Admin@123", branch_id });
  });
  db.branchesSeeded = true;
  return true;
}
