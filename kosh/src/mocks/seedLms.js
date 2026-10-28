/* DEMO ONLY: sample LMS courses (5th-10th school subjects, 11th/12th for JEE Main, JEE Advanced, NEET, MHT-CET) + a few stream students.
   Video lessons carry a YouTube *search* link so the demo has something to open; the admin replaces them with real lecture links. */
const ch = (s) => s.split("|");
const SCHOOL = {
  Mathematics: { "5th": ch("Large Numbers|Fractions|Basic Geometry"), "6th": ch("Integers|Ratio and Proportion|Algebra Basics"), "7th": ch("Rational Numbers|Simple Equations|Triangles"), "8th": ch("Squares and Roots|Linear Equations|Mensuration"), "9th": ch("Polynomials|Coordinate Geometry|Triangles"), "10th": ch("Quadratic Equations|Arithmetic Progression|Trigonometry") },
  Science: { "5th": ch("Plants|Human Body|Matter"), "6th": ch("Food and Nutrition|Fibre to Fabric|Motion"), "7th": ch("Nutrition in Plants|Heat|Acids and Bases"), "8th": ch("Cell Structure|Force and Pressure|Light"), "9th": ch("Matter Around Us|Atoms and Molecules|Motion"), "10th": ch("Chemical Reactions|Life Processes|Electricity") },
};
const STREAM = {
  Physics: { "11th": ch("Units and Kinematics|Laws of Motion|Work Energy Power"), "12th": ch("Electrostatics|Current Electricity|Ray Optics") },
  Chemistry: { "11th": ch("Mole Concept|Atomic Structure|Chemical Bonding"), "12th": ch("Solutions|Electrochemistry|Chemical Kinetics") },
  Mathematics: { "11th": ch("Sets and Functions|Trigonometry|Complex Numbers"), "12th": ch("Matrices and Determinants|Calculus|Vectors and 3D") },
  Biology: { "11th": ch("Cell: Unit of Life|Plant Kingdom|Human Physiology"), "12th": ch("Genetics and Evolution|Reproduction|Biotechnology") },
};
const LEVEL = { "JEE (Main)": "Concepts + PYQs", "JEE (Advanced)": "Advanced problems", "NEET": "NCERT-based", "MHT-CET": "State-board pattern" };
const SUBJ = { "JEE (Main)": ["Physics", "Chemistry", "Mathematics"], "JEE (Advanced)": ["Physics", "Chemistry", "Mathematics"], "NEET": ["Physics", "Chemistry", "Biology"], "MHT-CET": ["Physics", "Chemistry", "Mathematics", "Biology"] };
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

function course(id, standard, target, subject, chapters) {
  const tag = target ? ` (${LEVEL[target]})` : "";
  let l = 0;
  const lessons = chapters.map((c) => ({ id: ++l, title: `${c}${tag}`, chapter: c, kind: "Video", url: yt(`${c} ${standard} ${subject} ${target}`), minutes: 40, when: "" }));
  lessons.push({ id: ++l, title: "Doubt-solving live class", chapter: "Live sessions", kind: "Live class", url: "", minutes: 60, when: "Every Saturday, 5:00 PM" });
  lessons.push({ id: ++l, title: "Chapter practice test", chapter: "Practice", kind: "Practice", url: "", minutes: 30, when: "" });
  return { id, title: `${target ? target + " - " : ""}${subject} ${standard}`, standard, target: target || "", subject, description: target ? `${subject} for ${standard} ${target} aspirants.` : `${subject} for ${standard} (school syllabus).`, status: "Published", lessons, created_on: "2026-10-27" };
}

export function seedLms(db) {
  if (db.lmsSeeded) return false;
  let id = db.courses.reduce((m, c) => Math.max(m, c.id), 0);
  Object.entries(SCHOOL).forEach(([subject, byStd]) => Object.entries(byStd).forEach(([std, chapters]) => db.courses.push(course(++id, std, "", subject, chapters))));
  ["11th", "12th"].forEach((std) => Object.entries(SUBJ).forEach(([target, subs]) => subs.forEach((s) => db.courses.push(course(++id, std, target, s, STREAM[s][std])))));
  /* students of 11th / 12th / Dropper need an exam target: give old demo registrations one, add a student per stream */
  const targets = Object.keys(SUBJ);
  db.registrations.forEach((r, i) => { if (["11th", "12th", "Dropper / Repeater"].includes(r.standard) && !r.target) r.target = targets[i % 4]; });
  let rid = db.registrations.reduce((m, r) => Math.max(m, r.id), 0);
  [["Kavya Joshi", "11th", "JEE (Main)"], ["Om Kale", "12th", "JEE (Advanced)"], ["Aditya Pawar", "12th", "NEET"], ["Tanvi Gaikwad", "11th", "MHT-CET"]].forEach(([name, standard, target], i) => {
    const username = name.split(" ")[0].toLowerCase();
    if (db.registrations.some((r) => r.username === username)) return;
    db.registrations.push({ id: ++rid, name, mobile: `98230${20000 + i * 131}`, standard, target, medium: "English", date_of_birth: "2009-05-1" + i, email: `${username}@example.com`, parent_name: `${name.split(" ")[1]} (Parent)`, parent_mobile: `99230${30000 + i * 77}`, school_name: "Nashik Junior College", username, password: "Student@123", status: "Active", registered_on: "2026-10-27" });
  });
  db.lmsSeeded = true;
  return true;
}
