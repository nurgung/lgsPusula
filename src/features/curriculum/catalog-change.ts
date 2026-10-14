import type { AuditLog } from "@/features/auth/ports";
import type { UserRole } from "@/types/roles";
import type { CatalogFormState } from "./form-state";
import type { CatalogEntity } from "./schemas";

export type CatalogWriteResult = "ok" | "duplicate" | "denied" | "not_found";
export type CatalogAction = "create" | "update" | "archive" | "restore";

export const CATALOG_MESSAGES = {
  notAllowed: "Bu işlem için yönetici girişi ve iki adımlı doğrulama gerekiyor.",
  formInvalid: "Formda düzeltilmesi gereken alanlar var.",
  notFound: "Kayıt bulunamadı. Sayfayı yenileyip tekrar dene.",
  providerError: "Şu anda kaydedilemedi. Biraz sonra tekrar dene.",
  duplicate: {
    subject: "Bu kodla bir ders zaten var.",
    topic: "Bu derste aynı ad ve kaynak sürümüyle bir konu zaten var.",
    learning_outcome: "Bu kod ve kaynak sürümüyle bir kazanım zaten var.",
  },
  created: {
    subject: "Ders eklendi.",
    topic: "Konu eklendi.",
    learning_outcome: "Kazanım eklendi.",
  },
  updated: "Değişiklik kaydedildi.",
  archived: "Eski sürüm olarak işaretlendi. Öğrenci artık bunu seçemez.",
  restored: "Yeniden kullanıma açıldı. Öğrenci bunu yine seçebilir.",
} as const;

/** Only an admin whose session completed TOTP may change the catalog (decision 0.13). */
export function canChangeCatalog(user: {
  roles: readonly UserRole[];
  assuranceLevel: "aal1" | "aal2";
}): boolean {
  return user.roles.includes("admin") && user.assuranceLevel === "aal2";
}

function successMessage(entity: CatalogEntity, action: CatalogAction): string {
  switch (action) {
    case "create":
      return CATALOG_MESSAGES.created[entity];
    case "update":
      return CATALOG_MESSAGES.updated;
    case "archive":
      return CATALOG_MESSAGES.archived;
    case "restore":
      return CATALOG_MESSAGES.restored;
  }
}

/**
 * Checks the caller, runs the write and records the outcome. The database repeats the admin
 * and TOTP check in its RLS policies, so a bug here still cannot let a student write.
 */
export async function runCatalogChange(
  input: {
    user: { id: string; roles: readonly UserRole[]; assuranceLevel: "aal1" | "aal2" };
    entity: CatalogEntity;
    action: CatalogAction;
    write: () => Promise<CatalogWriteResult>;
  },
  deps: { audit: AuditLog },
): Promise<CatalogFormState> {
  const { user, entity, action } = input;
  const metadata = { catalogEntity: entity, catalogAction: action } as const;

  if (!canChangeCatalog(user)) {
    await deps.audit.record({
      type: "admin.catalog_change",
      outcome: "blocked",
      actorId: user.id,
      metadata: { ...metadata, reason: "not_allowed" },
    });
    return { status: "error", message: CATALOG_MESSAGES.notAllowed };
  }

  const result = await input.write();
  if (result === "ok") {
    await deps.audit.record({
      type: "admin.catalog_change",
      outcome: "success",
      actorId: user.id,
      metadata,
    });
    return { status: "success", message: successMessage(entity, action) };
  }

  await deps.audit.record({
    type: "admin.catalog_change",
    outcome: result === "denied" ? "blocked" : "failure",
    actorId: user.id,
    metadata: {
      ...metadata,
      reason:
        result === "duplicate"
          ? "duplicate"
          : result === "not_found"
            ? "not_found"
            : "not_allowed",
    },
  });
  if (result === "duplicate") {
    return { status: "error", message: CATALOG_MESSAGES.duplicate[entity] };
  }
  if (result === "not_found")
    return { status: "error", message: CATALOG_MESSAGES.notFound };
  return { status: "error", message: CATALOG_MESSAGES.notAllowed };
}
