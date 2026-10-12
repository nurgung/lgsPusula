// Fictional sample data for UI previews only. Not real students, not real results.

export const DEMO_STUDENT = {
  displayName: "Deniz (örnek)",
  mascot: { name: "Fidan", kind: "bitki", stageLabel: "Filiz aşaması" },
};

export const DEMO_TODAY_GOAL = { solved: 6, target: 10, unit: "soru" };

export const DEMO_SUGGESTION = {
  title: "Matematikte üslü ifadeler konusunu tekrar etmek faydalı olabilir.",
  reason: "Bu öneri, örnek verideki son iki deneme kaydına dayanıyor.",
};

export const DEMO_TASKS = [
  { id: "t1", label: "Bugün 10 soruluk hedefini tamamla", done: false },
  { id: "t2", label: "Fen Bilimleri için 20 dakika tekrar yap", done: true },
];

export const DEMO_LAST_EXAM = {
  name: "Örnek Deneme 1",
  dateLabel: "5 Ekim 2026",
  results: [
    { subject: "Türkçe", correct: 15, wrong: 3, blank: 2 },
    { subject: "Matematik", correct: 11, wrong: 5, blank: 4 },
    { subject: "Fen Bilimleri", correct: 14, wrong: 4, blank: 2 },
  ],
};

export const DEMO_WEEK = {
  rangeLabel: "5–11 Ekim 2026",
  days: [
    { day: "Pazartesi", questions: 40, minutes: 50 },
    { day: "Salı", questions: 0, minutes: 0 },
    { day: "Çarşamba", questions: 35, minutes: 45 },
    { day: "Perşembe", questions: 20, minutes: 30 },
    { day: "Cuma", questions: 45, minutes: 60 },
    { day: "Cumartesi", questions: 30, minutes: 40 },
    { day: "Pazar", questions: 0, minutes: 0 },
  ],
};

export const DEMO_SUBJECTS = [
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  "T.C. İnkılap Tarihi ve Atatürkçülük",
  "Din Kültürü ve Ahlak Bilgisi",
  "Yabancı Dil",
];
