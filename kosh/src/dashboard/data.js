/* UI constants only. Sample/demo data now lives in src/mocks; real data comes from src/services. */
export const BATCHES = ["JEE 2027", "NEET 2027", "MHT-CET 2027"];
export const TEST_TYPES = ["DPP", "Chapter-wise", "Mock", "Final Test"];
export const SUBJECTS = ["Physics", "Chemistry", "Mathematics"];

/* Registration / question-bank constants */
export const STANDARDS = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
export const REG_STANDARDS = [...STANDARDS, "Dropper / Repeater"];
export const MEDIUMS = ["Marathi", "English", "Semi-English", "Hindi"];
export const QUESTION_SUBJECTS = ["Marathi", "Hindi", "English", "Mathematics", "Science", "Social Science", "Physics", "Chemistry", "Biology"];
export const REG_STATUS = ["Active", "Inactive"];

/* LMS: 5th-10th are school classes; 11th / 12th / Dropper students also pick the entrance exam they prepare for. */
export const EXAM_TARGETS = ["JEE (Main)", "JEE (Advanced)", "NEET", "MHT-CET"];
export const TARGET_STANDARDS = ["11th", "12th", "Dropper / Repeater"];
export const SCHOOL_SUBJECTS = ["Marathi", "Hindi", "English", "Mathematics", "Science", "Social Science"];
export const TARGET_SUBJECTS = {
  "JEE (Main)": ["Physics", "Chemistry", "Mathematics"],
  "JEE (Advanced)": ["Physics", "Chemistry", "Mathematics"],
  "NEET": ["Physics", "Chemistry", "Biology"],
  "MHT-CET": ["Physics", "Chemistry", "Mathematics", "Biology"],
};
export const LESSON_KINDS = ["Video", "Notes", "Live class", "Practice"];
export const LESSON_ICON = { Video: "🎬", Notes: "📄", "Live class": "🔴", Practice: "✍️" };
export const needsTarget = (standard) => TARGET_STANDARDS.includes(standard);
/* subjects a course can have for a standard (+ target); no target on 11th/12th = common (all streams) */
export const subjectsFor = (standard, target) =>
  !needsTarget(standard) ? SCHOOL_SUBJECTS : target ? TARGET_SUBJECTS[target] : ["Physics", "Chemistry", "Mathematics", "Biology"];
