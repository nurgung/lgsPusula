import { describe, expect, it } from "vitest";
import { noticeText, supportiveNoticeIssues } from "./notice";

describe("student data notice", () => {
  it("says what is stored, what is not, and that a parent needs approval", () => {
    const text = noticeText();
    expect(text).toContain("Çalışma kayıtların");
    expect(text).toContain("kimlik numaran");
    expect(text).toContain("onaylamadan");
    expect(text).toContain("değiştiremez");
    expect(text).toContain("telefonda saklanmaz");
    expect(text).toContain("Yapay zekâ kapalıyken");
    expect(supportiveNoticeIssues(text)).toEqual([]);
  });
});
