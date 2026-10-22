export const STUDENT_DATA_NOTICE = {
  title: "Bu uygulamada neler durur?",
  kept: [
    "Görünen adın",
    "Çalışma kayıtların ve hedeflerin",
    "Deneme sonuçların ve seçtiğin kazanımlar",
    "Karakter puanın ve bildirim ayarın",
  ],
  notKept: "Adın ve soyadın, okulun, kimlik numaran ve telefonun istenmez.",
  parent:
    "Velin, sen onaylamadan kayıtlarını göremez. Onaylarsan görebilir ama değiştiremez. Bağlantıyı istediğin zaman kaldırabilirsin.",
  device: "Uygulamayı telefona eklesen bile kayıtlar telefonda saklanmaz.",
  ai: "Yapay zekâ kapalıyken öneri yalnızca kurallardan gelir. Açarsan modele adın gitmez. İstediğin zaman kapatabilirsin.",
} as const;

const FORBIDDEN = ["utanç", "herkes senden", "başaramaz", "ceza", "kork"];

export function noticeText(): string {
  return [
    STUDENT_DATA_NOTICE.title,
    ...STUDENT_DATA_NOTICE.kept,
    STUDENT_DATA_NOTICE.notKept,
    STUDENT_DATA_NOTICE.parent,
    STUDENT_DATA_NOTICE.device,
    STUDENT_DATA_NOTICE.ai,
  ].join(" ");
}

export function supportiveNoticeIssues(text: string): string[] {
  const lower = text.toLocaleLowerCase("tr");
  return FORBIDDEN.filter((phrase) => lower.includes(phrase));
}
