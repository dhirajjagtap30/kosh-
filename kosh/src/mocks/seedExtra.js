/* DEMO ONLY — extra sample questions so every subject has a question bank + a ready practice paper.
   Format: [question, correctAnswer, wrong1, wrong2, wrong3]  (the correct option is rotated through A-D automatically). */
const J = ["5th", "6th", "7th"];
const M = ["8th", "9th", "10th"];
const S = ["11th", "12th"];
const M2 = ["8th", "9th", "10th"];

const BANK = [
  /* ---------------- Marathi ---------------- */
  ["Marathi", J, "Grammar", [
    ["'फूल' या शब्दाचे अनेकवचन कोणते?", "फुले", "फुला", "फुलांनी", "फुलाचे"],
    ["'सूर्य' या शब्दाचा समानार्थी शब्द कोणता?", "रवी", "चंद्र", "तारा", "नदी"],
    ["'दिवस' या शब्दाचा विरुद्धार्थी शब्द कोणता?", "रात्र", "सकाळ", "दुपार", "संध्याकाळ"],
    ["महाराष्ट्राची राजभाषा कोणती?", "मराठी", "हिंदी", "इंग्रजी", "गुजराती"],
    ["'पाणी' हे कोणत्या प्रकारचे नाम आहे?", "सामान्यनाम", "विशेषनाम", "भाववाचक नाम", "सर्वनाम"],
  ]],
  ["Marathi", M, "Grammar", [
    ["'ती गाणे गाते' — या वाक्यातील क्रियापद कोणते?", "गाते", "ती", "गाणे", "यापैकी नाही"],
    ["'सागर' या शब्दाचा समानार्थी शब्द कोणता?", "समुद्र", "नदी", "तळे", "डोंगर"],
    ["'सत्य' या शब्दाचा विरुद्धार्थी शब्द कोणता?", "असत्य", "खरे", "सत्त्व", "सत्कार"],
    ["'आभाळ फाटणे' या वाक्प्रचाराचा अर्थ काय?", "मोठे संकट कोसळणे", "खूप पाऊस पडणे", "आकाश निरभ्र होणे", "ढग जमणे"],
    ["'तुकाराम' हे कोणत्या प्रकारचे नाम आहे?", "विशेषनाम", "सामान्यनाम", "भाववाचक नाम", "सर्वनाम"],
  ]],
  ["Marathi", S, "Literature", [
    ["'ज्ञानेश्वरी' हा ग्रंथ कोणी लिहिला?", "संत ज्ञानेश्वर", "संत तुकाराम", "संत नामदेव", "संत एकनाथ"],
    ["'यमक' हा कोणता अलंकार आहे?", "शब्दालंकार", "अर्थालंकार", "उभयालंकार", "यापैकी नाही"],
    ["'कुसुमाग्रज' यांचे मूळ नाव काय?", "विष्णू वामन शिरवाडकर", "पु. ल. देशपांडे", "वि. स. खांडेकर", "बा. सी. मर्ढेकर"],
    ["मराठी भाषा दिन कोणत्या तारखेला साजरा केला जातो?", "२७ फेब्रुवारी", "१ मे", "१५ ऑगस्ट", "२६ जानेवारी"],
    ["'उपमा' अलंकारात सामान्यतः कोणता शब्द वापरला जातो?", "सारखा / प्रमाणे", "म्हणून", "कारण", "जर"],
  ]],
  /* ---------------- Hindi ---------------- */
  ["Hindi", J, "Vyakaran", [
    ["'किताब' का बहुवचन क्या है?", "किताबें", "किताबों", "किताबा", "किताबी"],
    ["'सूरज' का पर्यायवाची शब्द कौन-सा है?", "सूर्य", "चाँद", "तारा", "बादल"],
    ["'दिन' का विलोम शब्द क्या है?", "रात", "सुबह", "शाम", "दोपहर"],
    ["हिंदी भाषा किस लिपि में लिखी जाती है?", "देवनागरी", "रोमन", "गुरुमुखी", "बंगला"],
    ["'मोर' किस प्रकार की संज्ञा है?", "जातिवाचक", "व्यक्तिवाचक", "भाववाचक", "सर्वनाम"],
  ]],
  ["Hindi", M, "Vyakaran", [
    ["'राम ने आम खाया' — इस वाक्य में कर्ता कौन है?", "राम", "आम", "खाया", "ने"],
    ["'अमृत' का विलोम शब्द है:", "विष", "जल", "दूध", "रस"],
    ["'आँखों का तारा' मुहावरे का अर्थ है:", "बहुत प्यारा", "बहुत दुखी", "अंधा", "चतुर"],
    ["'पुस्तक' शब्द का पर्यायवाची है:", "ग्रंथ", "कलम", "कागज़", "स्याही"],
    ["'विद्यालय' शब्द में कौन-सी संधि है?", "दीर्घ संधि", "गुण संधि", "यण संधि", "व्यंजन संधि"],
  ]],
  ["Hindi", S, "Sahitya", [
    ["'गोदान' उपन्यास के लेखक कौन हैं?", "प्रेमचंद", "जयशंकर प्रसाद", "महादेवी वर्मा", "निराला"],
    ["'कामायनी' किसकी रचना है?", "जयशंकर प्रसाद", "सुमित्रानंदन पंत", "मैथिलीशरण गुप्त", "दिनकर"],
    ["'चाँद-सा मुखड़ा' में कौन-सा अलंकार है?", "उपमा", "रूपक", "अनुप्रास", "यमक"],
    ["हिंदी दिवस कब मनाया जाता है?", "14 सितंबर", "15 अगस्त", "2 अक्टूबर", "26 जनवरी"],
    ["'भारत-भारती' के रचयिता कौन हैं?", "मैथिलीशरण गुप्त", "तुलसीदास", "सूरदास", "कबीर"],
  ]],
  /* ---------------- English ---------------- */
  ["English", J, "Grammar", [
    ["Choose the correct plural of 'child':", "Children", "Childs", "Childen", "Childes"],
    ["Opposite of 'hot' is:", "Cold", "Hotter", "Warmth", "Boil"],
    ["Which of these is a noun?", "Dog", "Run", "Quickly", "Beautiful"],
    ["Fill in the blank: She ___ to school every day.", "goes", "go", "going", "gone"],
    ["A word that describes a noun is called:", "Adjective", "Verb", "Adverb", "Pronoun"],
  ]],
  ["English", M, "Grammar", [
    ["Choose the correct sentence:", "He doesn't like tea.", "He don't like tea.", "He not like tea.", "He doesn't likes tea."],
    ["The past tense of 'write' is:", "wrote", "written", "writed", "writing"],
    ["Synonym of 'rapid':", "quick", "slow", "late", "weak"],
    ["Antonym of 'ancient':", "modern", "old", "historic", "aged"],
    ["The part of speech of 'quickly' in 'He ran quickly.' is:", "Adverb", "Adjective", "Noun", "Verb"],
  ]],
  ["English", S, "Literature", [
    ["Who wrote 'Hamlet'?", "William Shakespeare", "Charles Dickens", "John Milton", "Thomas Hardy"],
    ["'A stitch in time saves nine' is a:", "proverb", "idiom", "simile", "metaphor"],
    ["Passive voice of 'She writes a letter.' is:", "A letter is written by her.", "A letter was written by her.", "A letter is being written by her.", "A letter has been written by her."],
    ["'Break the ice' means:", "start a friendly conversation", "destroy something", "feel very cold", "end a friendship"],
    ["Figure of speech in 'The wind whispered through the trees.':", "Personification", "Simile", "Hyperbole", "Alliteration"],
  ]],
  /* ---------------- Mathematics ---------------- */
  ["Mathematics", J, "Arithmetic", [
    ["What is 25 × 4?", "100", "90", "110", "80"],
    ["What is 3/4 + 1/4?", "1", "4/8", "3/16", "1/2"],
    ["Perimeter of a square of side 5 cm is:", "20 cm", "25 cm", "10 cm", "15 cm"],
    ["Which is the smallest prime number?", "2", "1", "3", "0"],
    ["What is 15% of 200?", "30", "15", "20", "45"],
  ]],
  ["Mathematics", M, "Algebra", [
    ["Solve: 3x − 5 = 16. x = ?", "7", "5", "6", "8"],
    ["The value of (a + b)² is:", "a² + 2ab + b²", "a² + b²", "a² − 2ab + b²", "2a + 2b"],
    ["HCF of 12 and 18 is:", "6", "3", "36", "2"],
    ["In a right triangle with hypotenuse c, Pythagoras theorem says:", "c² = a² + b²", "c = a + b", "c² = a² − b²", "a² = b² − c²"],
    ["Volume of a cube of side 3 cm is:", "27 cm³", "9 cm³", "18 cm³", "81 cm³"],
  ]],
  ["Mathematics", S, "Calculus", [
    ["Derivative of x² with respect to x is:", "2x", "x", "x²", "2"],
    ["∫ 2x dx = ?", "x² + C", "2x² + C", "x + C", "2 + C"],
    ["sin²θ + cos²θ = ?", "1", "0", "2", "sinθ"],
    ["Value of log₁₀ 100 is:", "2", "10", "1", "100"],
    ["Number of ways to arrange 3 distinct objects in a row:", "6", "3", "9", "12"],
  ]],
  /* ---------------- Science ---------------- */
  ["Science", J, "General", [
    ["Which planet is known as the Red Planet?", "Mars", "Venus", "Jupiter", "Saturn"],
    ["Plants prepare their food by the process of:", "Photosynthesis", "Respiration", "Digestion", "Transpiration"],
    ["Which gas do we breathe in?", "Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    ["Water freezes at:", "0 °C", "100 °C", "50 °C", "−10 °C"],
    ["Which organ pumps blood in the human body?", "Heart", "Lungs", "Liver", "Kidney"],
  ]],
  ["Science", M, "General", [
    ["SI unit of electric resistance is:", "Ohm", "Volt", "Ampere", "Watt"],
    ["pH of a neutral solution is:", "7", "0", "14", "1"],
    ["Which gas is released during photosynthesis?", "Oxygen", "Carbon dioxide", "Nitrogen", "Methane"],
    ["Chemical formula of water is:", "H₂O", "CO₂", "O₂", "H₂O₂"],
    ["Newton's first law of motion is also called the law of:", "Inertia", "Acceleration", "Gravitation", "Action-reaction"],
  ]],
  /* ---------------- Social Science ---------------- */
  ["Social Science", J, "General", [
    ["Who was the first Prime Minister of India?", "Jawaharlal Nehru", "Mahatma Gandhi", "Sardar Patel", "Lal Bahadur Shastri"],
    ["Capital of India is:", "New Delhi", "Mumbai", "Kolkata", "Chennai"],
    ["Which is the longest river flowing in India?", "Ganga", "Godavari", "Yamuna", "Narmada"],
    ["Chhatrapati Shivaji Maharaj was crowned at:", "Raigad", "Pune", "Sinhagad", "Satara"],
    ["India's national animal is:", "Tiger", "Lion", "Elephant", "Leopard"],
  ]],
  ["Social Science", M, "History & Civics", [
    ["In which year did India become independent?", "1947", "1950", "1942", "1935"],
    ["Who is known as the Father of the Indian Constitution?", "Dr. B. R. Ambedkar", "Gandhiji", "Nehru", "Sardar Patel"],
    ["The Indian Constitution came into effect on:", "26 January 1950", "15 August 1947", "2 October 1949", "26 November 1949"],
    ["The Tropic of Cancer passes through which Indian state?", "Gujarat", "Maharashtra", "Kerala", "Tamil Nadu"],
    ["Who founded Swarajya in Maharashtra?", "Chhatrapati Shivaji Maharaj", "Peshwa Bajirao", "Maharana Pratap", "Tipu Sultan"],
  ]],
  /* ---------------- Physics ---------------- */
  ["Physics", M2, "Mechanics", [
    ["SI unit of force is:", "Newton", "Joule", "Pascal", "Watt"],
    ["Speed is equal to:", "Distance / Time", "Time / Distance", "Distance × Time", "Mass × Velocity"],
    ["Which mirror is used by dentists?", "Concave", "Convex", "Plane", "Cylindrical"],
    ["Acceleration due to gravity on Earth is about:", "9.8 m/s²", "98 m/s²", "0.98 m/s²", "1.6 m/s²"],
    ["SI unit of work is:", "Joule", "Newton", "Watt", "Pascal"],
  ]],
  ["Physics", S, "Electricity & Mechanics", [
    ["SI unit of electric current is:", "Ampere", "Volt", "Ohm", "Coulomb"],
    ["SI unit of capacitance is:", "Farad", "Henry", "Tesla", "Weber"],
    ["Ohm's law states that:", "V = IR", "V = I/R", "I = VR", "R = VI"],
    ["Speed of light in vacuum is approximately:", "3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁵ m/s", "3 × 10¹⁰ m/s"],
    ["SI unit of magnetic flux density is:", "Tesla", "Weber", "Henry", "Farad"],
    ["Dimensional formula of force is:", "[M L T⁻²]", "[M L² T⁻²]", "[M L T⁻¹]", "[M L⁻¹ T⁻²]"],
  ]],
  /* ---------------- Chemistry ---------------- */
  ["Chemistry", M2, "Basics", [
    ["Chemical formula of common salt is:", "NaCl", "KCl", "NaOH", "HCl"],
    ["Atomic number of Carbon is:", "6", "12", "8", "14"],
    ["Which gas is dissolved in soda water?", "Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"],
    ["The pH value of an acid is:", "Less than 7", "Equal to 7", "More than 7", "Always 14"],
    ["Which of the following is a metal?", "Sodium", "Sulphur", "Oxygen", "Carbon"],
  ]],
  ["Chemistry", S, "Organic & Physical", [
    ["General formula of alkanes is:", "CnH2n+2", "CnH2n", "CnH2n−2", "CnHn"],
    ["Avogadro's number is:", "6.022 × 10²³", "6.022 × 10²²", "3.14 × 10²³", "1.6 × 10⁻¹⁹"],
    ["Which element has the highest electronegativity?", "Fluorine", "Oxygen", "Chlorine", "Nitrogen"],
    ["Hybridisation of carbon in methane (CH₄) is:", "sp³", "sp²", "sp", "dsp²"],
    ["IUPAC name of CH₃CH₂OH is:", "Ethanol", "Methanol", "Propanol", "Ethanal"],
  ]],
  /* ---------------- Biology ---------------- */
  ["Biology", M2, "Cell & Life", [
    ["Powerhouse of the cell is:", "Mitochondria", "Nucleus", "Ribosome", "Vacuole"],
    ["Which blood group is called the universal donor?", "O negative", "AB positive", "A positive", "B negative"],
    ["Which vitamin is made in the skin by sunlight?", "Vitamin D", "Vitamin C", "Vitamin A", "Vitamin K"],
    ["The basic unit of life is:", "Cell", "Tissue", "Organ", "Atom"],
    ["Which tissue conducts water in plants?", "Xylem", "Phloem", "Stomata", "Cambium"],
  ]],
  ["Biology", S, "Genetics & Physiology", [
    ["DNA stands for:", "Deoxyribonucleic acid", "Dinitro nucleic acid", "Deoxyribonitric acid", "Dioxy nucleic acid"],
    ["Who proposed the theory of natural selection?", "Charles Darwin", "Gregor Mendel", "Lamarck", "Hugo de Vries"],
    ["Site of protein synthesis in a cell is:", "Ribosome", "Lysosome", "Golgi body", "Nucleolus"],
    ["Father of Genetics is:", "Gregor Mendel", "Charles Darwin", "James Watson", "T. H. Morgan"],
    ["Which hormone regulates blood sugar?", "Insulin", "Thyroxine", "Adrenaline", "Oestrogen"],
  ]],
  /* ---------------- gap fillers: every subject for every standard (5th - 12th) ---------------- */
  ["Physics", J, "Basics", [
    ["Which of these is a source of light?", "Sun", "Moon", "Mirror", "Stone"],
    ["We are able to see things because of:", "Light", "Sound", "Smell", "Taste"],
    ["What pulls objects towards the Earth?", "Gravity", "Magnetism", "Friction", "Wind"],
    ["Which material is attracted by a magnet?", "Iron", "Wood", "Plastic", "Glass"],
    ["Sound cannot travel through:", "Vacuum", "Air", "Water", "Steel"],
  ]],
  ["Chemistry", J, "Basics", [
    ["Which of these is a liquid at room temperature?", "Water", "Iron", "Oxygen", "Wood"],
    ["Water changes into steam when it is:", "Heated", "Cooled", "Frozen", "Stirred"],
    ["Which gas is needed for burning?", "Oxygen", "Nitrogen", "Helium", "Neon"],
    ["Rusting happens to:", "Iron", "Gold", "Plastic", "Glass"],
    ["Which of these is a mixture?", "Sugar dissolved in water", "Pure iron", "Oxygen gas", "Distilled water"],
  ]],
  ["Biology", J, "Basics", [
    ["Which part of a plant absorbs water from the soil?", "Roots", "Leaves", "Flowers", "Stem"],
    ["Humans breathe with the help of:", "Lungs", "Heart", "Stomach", "Kidneys"],
    ["Which animal gives us milk?", "Cow", "Hen", "Fish", "Frog"],
    ["Which part of a plant makes food?", "Leaf", "Root", "Seed", "Fruit"],
    ["An adult human body has about how many bones?", "206", "106", "306", "150"],
  ]],
  ["Science", S, "General", [
    ["Which law relates pressure and volume of a gas at constant temperature?", "Boyle's law", "Charles's law", "Ohm's law", "Hooke's law"],
    ["SI unit of energy is:", "Joule", "Watt", "Newton", "Pascal"],
    ["Chemical symbol of Gold is:", "Au", "Ag", "Go", "Gd"],
    ["Which organelle contains the genetic material of a eukaryotic cell?", "Nucleus", "Ribosome", "Lysosome", "Vacuole"],
    ["Atomic number is the number of:", "protons in the nucleus", "neutrons in the nucleus", "protons + neutrons", "electron shells"],
  ]],
  ["Social Science", S, "History & Polity", [
    ["Who was the first President of India?", "Dr. Rajendra Prasad", "Dr. S. Radhakrishnan", "Jawaharlal Nehru", "Dr. Zakir Husain"],
    ["The Revolt of 1857 began at:", "Meerut", "Delhi", "Kanpur", "Jhansi"],
    ["Which Article of the Constitution abolishes untouchability?", "Article 17", "Article 14", "Article 21", "Article 19"],
    ["The Reserve Bank of India was established in:", "1935", "1947", "1950", "1969"],
    ["The Quit India Movement was launched in:", "1942", "1930", "1920", "1947"],
  ]],
];

/* Flatten to question objects (standard, subject, chapter, question, options, answer, marks). */
export const extraQuestions = (() => {
  const out = [];
  let n = 0;
  BANK.forEach(([subject, standards, chapter, rows]) => {
    standards.forEach((standard) => {
      rows.forEach(([question, right, ...wrong]) => {
        const pos = n++ % 4; // spread the correct answer over A, B, C, D
        const options = [...wrong];
        options.splice(pos, 0, right);
        out.push({ standard, subject, chapter, question, options, answer: pos, marks: 1 });
      });
    });
  });
  return out;
})();

/* DEMO ONLY — a few subjective (written-answer) questions. Marks are given by the teacher while checking. */
const sub = (standard, subject, chapter, question, modelAnswer, marks) => ({ standard, subject, chapter, type: "Subjective", question, options: [], answer: null, model_answer: modelAnswer, marks });
export const subjectiveQuestions = [
  sub("10th", "Mathematics", "Quadratic Equations", "Solve x² − 5x + 6 = 0 by factorisation. Show all steps.", "(x−2)(x−3)=0, so x = 2 or x = 3.", 3),
  sub("10th", "Mathematics", "Arithmetic Progression", "Find the sum of the first 20 terms of the AP 3, 7, 11, …", "a=3, d=4, S20 = 20/2 × (2×3 + 19×4) = 820.", 4),
  sub("10th", "Science", "Life Processes", "Explain the process of photosynthesis in 4–5 lines.", "Plants make glucose from CO₂ and water using sunlight and chlorophyll, releasing oxygen.", 3),
  sub("10th", "English", "Writing", "Write a short paragraph (5 lines) on 'My Favourite Teacher'.", "Any well-structured paragraph.", 3),
  sub("9th", "Science", "Motion", "Define uniform motion and give one example.", "Equal distances covered in equal intervals of time; e.g. a car moving at a constant speed.", 2),
  sub("9th", "Mathematics", "Polynomials", "Find the value of p(x) = x² − 3x + 2 at x = 4.", "16 − 12 + 2 = 6.", 2),
];

export const SEED_VERSION = 4;
