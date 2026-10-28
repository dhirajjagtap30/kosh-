/* DEMO ONLY — sample data for the mock API. Delete this folder once the Django backend is live. */
import { BATCHES, SUBJECTS } from "../dashboard/data";

const names = [
  "Aarav Patil", "Sneha Kulkarni", "Rohan Deshmukh", "Isha Jadhav", "Vedant More", "Priya Shinde",
  "Omkar Pawar", "Ananya Gaikwad", "Siddharth Kale", "Riya Bhosale", "Atharv Sawant", "Kavya Joshi",
  "Yash Chavan", "Mitali Naik", "Harsh Thakur", "Pooja Mane", "Tanmay Salunkhe", "Shruti Ghate",
  "Nikhil Raut", "Diksha Kadam", "Pratik Wagh", "Sakshi Bhoir", "Rahul Nimbalkar", "Aditi Phadke",
];

export const seedStudents = names.map((name, i) => ({
  id: i + 1,
  name,
  batch: BATCHES[i % 3],
  phone: `98765${43210 + i * 173}`,
}));

export const seedTests = [
  { id: 1, name: "Physics DPP - Kinematics", type: "DPP", batch: "JEE 2027", date: "2026-08-12", duration: 45, totalMarks: 60, status: "Completed" },
  { id: 2, name: "Biology Chapter Test - Cell", type: "Chapter-wise", batch: "NEET 2027", date: "2026-08-26", duration: 60, totalMarks: 100, status: "Completed" },
  { id: 3, name: "MHT-CET Mock 1", type: "Mock", batch: "MHT-CET 2027", date: "2026-09-05", duration: 180, totalMarks: 200, status: "Completed" },
  { id: 4, name: "Maths DPP - Quadratics", type: "DPP", batch: "JEE 2027", date: "2026-09-14", duration: 45, totalMarks: 60, status: "Completed" },
  { id: 5, name: "NEET Mock 1", type: "Mock", batch: "NEET 2027", date: "2026-09-24", duration: 180, totalMarks: 720, status: "Completed" },
  { id: 6, name: "Chemistry Chapter Test - Bonding", type: "Chapter-wise", batch: "MHT-CET 2027", date: "2026-10-03", duration: 60, totalMarks: 100, status: "Completed" },
  { id: 7, name: "JEE Mock 2", type: "Mock", batch: "JEE 2027", date: "2026-10-10", duration: 180, totalMarks: 300, status: "Completed" },
  { id: 8, name: "NEET Final Test", type: "Final Test", batch: "NEET 2027", date: "2026-10-20", duration: 180, totalMarks: 720, status: "Scheduled" },
  { id: 9, name: "MHT-CET Mock 2", type: "Mock", batch: "MHT-CET 2027", date: "2026-10-28", duration: 180, totalMarks: 200, status: "Scheduled" },
  { id: 11, name: "10th Maths Unit Test 1", type: "Chapter-wise", batch: "JEE 2027", standard: "10th", paper_id: 1, date: "2026-10-20", duration: 30, totalMarks: 6, status: "Scheduled" },
  { id: 10, name: "JEE Final Test", type: "Final Test", batch: "JEE 2027", date: "2026-11-05", duration: 180, totalMarks: 300, status: "Draft" },
];

export const seedSettings = {
  institute: "Jai Gajanan Coaching Classes",
  email: "admin@example.com",
  phone: "",
  lowScoreBelow: 40,
  notifyEmail: true,
  notifyLowScore: true,
};

export const seedNotifications = [
  { id: 1, text: "JEE Mock 2 results are ready for review.", read: false },
  { id: 2, text: "NEET Final Test is scheduled for 20 Oct.", read: false },
  { id: 3, text: "Batch MHT-CET 2027 report is available.", read: true },
];

/* Deterministic pseudo-random number in [0,1) so demo data stays stable. */
export const hash = (...nums) => {
  let h = 2166136261;
  for (const x of nums) {
    h = Math.imul(h ^ (x | 0), 16777619);
    h ^= h >>> 15;
  }
  return ((h >>> 0) % 100000) / 100000;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* Demo results for every completed test. A real backend returns these from the database (GET /results/). */
export function computeResults(students, tests) {
  const out = [];
  tests
    .filter((t) => t.status === "Completed")
    .forEach((t) => {
      students
        .filter((s) => s.batch === t.batch)
        .forEach((s) => {
          const ability = 35 + hash(s.id, 1) * 55;
          const score = clamp(ability + (hash(s.id, t.id) - 0.5) * 24, 5, 100);
          const subjects = {};
          SUBJECTS.forEach((sub, i) => {
            subjects[sub] = clamp(score + (hash(s.id, t.id, i + 10) - 0.5) * 24, 0, 100);
          });
          out.push({ testId: t.id, studentId: s.id, score, marks: Math.round((score / 100) * t.totalMarks), subjects });
        });
    });
  return out;
}

/* Student portal sample (as the API would send it). */
export const seedStudentPortal = {
  student: { name: "Abhijeet", institute: "Jai Gajanan Coaching Classes", batch: "Regular - Target 2027", rank: 1, accuracy: 1.6, tests_done: 2 },
  stats: { total: 2, completed: 2, pending: 0, missed: 0, avg_accuracy: null, correct: 1.6, incorrect: 4.11, unattempted: 94.3, avg_time: "0s", overall: 2.03 },
  subjects: [{ name: "PCM", value: 1.35 }, { name: "PHYSICS", value: 2.71 }],
  trend: [3, 6, 2.5, 4, 4, 1.5, 3.5, 3, 1.5, 4.5],
  upcoming_exams: [],
  unread_notifications: 10,
};

/* ---- demo registrations / question bank / papers (snake_case, same as the API) ---- */
const regNames = [["Aarav Patil", "5th", "Marathi"], ["Sneha Kulkarni", "8th", "English"], ["Rohan Deshmukh", "10th", "Semi-English"], ["Isha Jadhav", "10th", "Marathi"], ["Vedant More", "12th", "English"], ["Priya Shinde", "9th", "Marathi"]];
export const seedRegistrations = regNames.map(([name, standard, medium], i) => ({
  id: i + 1, name, mobile: `98765${10000 + i * 111}`, standard, medium, date_of_birth: `20${10 - (i % 4)}-0${(i % 9) + 1}-1${i}`,
  email: `${name.split(" ")[0].toLowerCase()}@example.com`, parent_name: `${name.split(" ")[1]} (Parent)`, parent_mobile: `99221${10000 + i * 97}`,
  school_name: "Nashik Vidyalaya", username: name.split(" ")[0].toLowerCase(), password: "Student@123", status: "Active", registered_on: `2026-10-${String(10 + i).padStart(2, "0")}`,
}));

const mcq = (standard, subject, chapter, question, options, answer, marks = 1) => ({ standard, subject, chapter, question, options, answer, marks });
export const seedQuestions = [
  mcq("10th", "Mathematics", "Algebra", "What is the value of x if 2x + 6 = 14?", ["2", "4", "6", "8"], 1),
  mcq("10th", "Mathematics", "Algebra", "Sum of roots of x² − 5x + 6 = 0 is:", ["5", "6", "−5", "1"], 0, 2),
  mcq("10th", "Mathematics", "Geometry", "Sum of angles of a triangle is:", ["90°", "180°", "270°", "360°"], 1),
  mcq("10th", "Mathematics", "Mensuration", "Area of a circle of radius 7 cm (π = 22/7) is:", ["44 cm²", "154 cm²", "49 cm²", "22 cm²"], 1, 2),
  mcq("10th", "Science", "Light", "Which mirror is used as a rear-view mirror in vehicles?", ["Concave", "Convex", "Plane", "Cylindrical"], 1),
  mcq("10th", "Science", "Chemistry", "The chemical formula of common salt is:", ["NaOH", "KCl", "NaCl", "HCl"], 2),
  mcq("8th", "Science", "Force", "SI unit of force is:", ["Joule", "Newton", "Watt", "Pascal"], 1),
  mcq("8th", "Science", "Cell", "Which organelle is called the powerhouse of the cell?", ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"], 2),
  mcq("8th", "English", "Grammar", "Choose the correct plural of 'child':", ["Childs", "Childen", "Children", "Childes"], 2),
  mcq("12th", "Physics", "Current", "SI unit of electric current is:", ["Volt", "Ampere", "Ohm", "Coulomb"], 1),
  mcq("12th", "Chemistry", "Organic", "General formula of alkanes is:", ["CnH2n", "CnH2n+2", "CnH2n−2", "CnHn"], 1),
  mcq("9th", "Social Science", "History", "Who is known as the Father of the Indian Constitution?", ["Gandhiji", "Nehru", "Dr. B. R. Ambedkar", "Sardar Patel"], 2),
].map((q, i) => ({ id: i + 1, ...q }));

export const seedPapers = [
  { id: 1, title: "10th Mathematics - Unit Test 1", standard: "10th", subject: "Mathematics", duration: 30, status: "Published", question_ids: [1, 2, 3, 4], created_on: "2026-10-20" },
];
