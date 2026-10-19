import type { ExamType } from "./net-rules";

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  lgs_full: "Tam LGS denemesi",
  branch: "Branş denemesi",
};

/** Friendly names for LGS slots when the catalog row is missing a display name. */
export const LGS_SUBJECT_LABELS: Record<string, string> = {
  turkce: "Türkçe",
  matematik: "Matematik",
  fen_bilimleri: "Fen Bilimleri",
  inkilap_tarihi: "T.C. İnkılap Tarihi ve Atatürkçülük",
  din_kulturu: "Din Kültürü ve Ahlak Bilgisi",
  ingilizce: "Yabancı Dil (İngilizce)",
};
