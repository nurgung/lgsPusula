"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FormErrorSummary,
  NumberField,
  SelectField,
  TextField,
  type FormErrorItem,
} from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

const SUBJECTS = [
  { value: "turkce", label: "Türkçe" },
  { value: "matematik", label: "Matematik" },
  { value: "fen", label: "Fen Bilimleri" },
] as const;

const FIELD_IDS = {
  subject: "ornek-ders",
  questions: "ornek-soru",
  minutes: "ornek-sure",
} as const;

/**
 * Demo-only checks so the error states can be seen. The real study-log rules
 * (non-negative values, consistent totals) are a shared server-side schema in Phase 6.
 */
function demoErrors(form: FormData): FormErrorItem[] {
  const errors: FormErrorItem[] = [];
  if (!form.get("subject")) {
    errors.push({ fieldId: FIELD_IDS.subject, message: "Bir ders seç." });
  }
  const questions = String(form.get("questions") ?? "").trim();
  if (!/^\d+$/.test(questions)) {
    errors.push({
      fieldId: FIELD_IDS.questions,
      message: "Soru sayısını rakamla yaz. Örneğin: 20",
    });
  }
  const minutes = String(form.get("minutes") ?? "").trim();
  if (minutes !== "" && !/^\d+$/.test(minutes)) {
    errors.push({
      fieldId: FIELD_IDS.minutes,
      message: "Süreyi dakika olarak rakamla yaz.",
    });
  }
  return errors;
}

export function ComponentsDemo() {
  const { showToast } = useToast();
  const [errors, setErrors] = useState<FormErrorItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const errorFor = (fieldId: string) =>
    errors.find((item) => item.fieldId === fieldId)?.message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = demoErrors(new FormData(event.currentTarget));
    setErrors(found);
    if (found.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.querySelector("a")?.focus());
      return;
    }
    showToast({
      variant: "success",
      title: "Örnek kayıt eklendi.",
      description: "Bu bir önizleme; hiçbir şey kaydedilmedi.",
    });
  }

  return (
    <div className="grid gap-6">
      <Card
        title="Form alanları"
        description="Görünür etiket, yardım metni, alan hatası ve mobilde rakam klavyesi."
      >
        <form noValidate onSubmit={handleSubmit} className="grid gap-4">
          <div ref={summaryRef}>
            <FormErrorSummary errors={errors} />
          </div>
          <SelectField
            id={FIELD_IDS.subject}
            name="subject"
            label="Ders"
            placeholder="Ders seç"
            options={SUBJECTS}
            error={errorFor(FIELD_IDS.subject)}
          />
          <NumberField
            id={FIELD_IDS.questions}
            name="questions"
            label="Çözülen soru"
            hint="Bugün bu derste çözdüğün soru sayısı."
            unit="soru"
            error={errorFor(FIELD_IDS.questions)}
          />
          <NumberField
            id={FIELD_IDS.minutes}
            name="minutes"
            label="Çalışma süresi"
            unit="dakika"
            optional
            error={errorFor(FIELD_IDS.minutes)}
          />
          <TextField name="note" label="Kısa not" optional maxLength={200} />
          <div>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </Card>

      <Card
        title="Onay penceresi"
        description="Silme gibi geri alınamayan işlemlerden önce sorulur. Esc tuşu pencereyi kapatır."
      >
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          Örnek kaydı sil
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          title="Bu kaydı silmek istiyor musun?"
          description="Silinen kayıt geri getirilemez. Bu bir önizleme; gerçekte hiçbir şey silinmez."
          confirmLabel="Sil"
          tone="danger"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            showToast({ variant: "success", title: "Örnek kayıt silindi." });
          }}
        />
      </Card>

      <Card
        title="Anlık bildirimler"
        description="Başarı ve bilgi bildirimleri birkaç saniye sonra kapanır; hata bildirimi sen kapatana kadar kalır."
      >
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              showToast({
                variant: "info",
                title: "Bu öneri, son deneme kayıtlarına dayanıyor.",
              })
            }
          >
            Bilgi göster
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              showToast({
                variant: "error",
                title: "Kayıt kaydedilemedi.",
                description:
                  "Bağlantında bir sorun olabilir. Girdiğin bilgiler kaybolmadı.",
              })
            }
          >
            Hata göster
          </Button>
        </div>
      </Card>
    </div>
  );
}
