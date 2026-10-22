"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { importStudyAction, type ImportFormState } from "../actions";
import { IMPORT_TEMPLATE } from "../plan";

const INITIAL: ImportFormState = { status: "idle" };

function downloadTemplate() {
  const blob = new Blob([IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "calisma-sablonu.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportForm() {
  const [state, action, pending] = useActionState(importStudyAction, INITIAL);

  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-ink-700">
        Sütunlar: tarih, ders, soru, dogru, yanlis, bos, sure. Tarih yıl-ay-gün
        biçimindedir. Dosya en fazla 500 KB ve 100 satır olabilir. Formül içeren satır
        alınmaz. PDF yalnızca içindeki etiketli satırlardan okunur; sayı uydurulmaz.
      </p>
      <div>
        <Button type="button" variant="secondary" onClick={downloadTemplate}>
          CSV şablonunu indir
        </Button>
      </div>
      <div className="grid gap-2">
        <label htmlFor="ice-aktar-dosya" className="font-semibold text-ink-900">
          Dosya
        </label>
        <input
          id="ice-aktar-dosya"
          name="file"
          type="file"
          accept=".csv,.xlsx,.pdf,text/csv,application/pdf"
          required
          className="min-h-11 max-w-full text-ink-900 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:font-semibold file:text-brand-700"
        />
      </div>
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      {state.status === "saved" ? (
        <StateMessage
          variant="success"
          title={`${state.created} yeni kayıt yazıldı. ${state.unchanged} satır zaten vardı.`}
        />
      ) : null}
      {state.status === "preview" ? (
        <div className="grid gap-3">
          {state.ready.length === 0 ? (
            <StateMessage
              variant="empty"
              title="Kaydedilecek satır yok."
              description="Aşağıdaki notlara bak. Hiçbir satır yazılmadı."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <caption className="mb-2 text-left font-semibold text-ink-900">
                  Yazılacak satırlar
                </caption>
                <thead>
                  <tr>
                    <th className="py-2 pr-3">Tarih</th>
                    <th className="py-2 pr-3">Ders</th>
                    <th className="py-2 pr-3">Soru</th>
                    <th className="py-2">Dakika</th>
                  </tr>
                </thead>
                <tbody>
                  {state.ready.map((row) => (
                    <tr
                      key={`${row.line}-${row.studiedOn}-${row.subjectName}`}
                      className="border-t border-border"
                    >
                      <td className="py-2 pr-3">{row.studiedOn}</td>
                      <td className="py-2 pr-3">{row.subjectName}</td>
                      <td className="py-2 pr-3">{row.questionCount} soru</td>
                      <td className="py-2">{row.durationMinutes} dakika</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {state.issues.length > 0 ? (
            <ul className="grid list-disc gap-1 pl-5 text-sm text-ink-700">
              {state.issues.map((issue) => (
                <li key={`${issue.line}-${issue.message}`}>
                  Satır {issue.line}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="confirm"
          value="hayir"
          variant="secondary"
          disabled={pending}
        >
          {pending ? "Bakılıyor..." : "Önizle"}
        </Button>
        {state.status === "preview" && state.ready.length > 0 ? (
          <Button type="submit" name="confirm" value="evet" disabled={pending}>
            {pending ? "Kaydediliyor..." : "Onayla ve kaydet"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
