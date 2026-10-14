import { CATALOG_LIMITS } from "../schemas";
import type { CatalogFieldSpec } from "./catalog-form";

type Source = { sourceName?: string; sourceVersion?: string };

const sourceFields = (defaults: Source): CatalogFieldSpec[] => [
  {
    name: "sourceName",
    label: "Kaynak adı",
    kind: "text",
    hint: "Örnek: MEB 8. sınıf öğretim programı veya MEB LGS kapsamı.",
    maxLength: CATALOG_LIMITS.sourceName,
    defaultValue: defaults.sourceName,
  },
  {
    name: "sourceVersion",
    label: "Kaynak sürümü",
    kind: "text",
    hint: "Programın yılı veya sürümü. Örnek: 2025-2026.",
    maxLength: CATALOG_LIMITS.sourceVersion,
    defaultValue: defaults.sourceVersion,
  },
];

const sortOrderField = (defaultValue?: number): CatalogFieldSpec => ({
  name: "sortOrder",
  label: "Sıra",
  kind: "number",
  optional: true,
  hint: "Küçük sayı önce gösterilir. Boş bırakırsan 0 olur.",
  defaultValue: defaultValue === undefined ? undefined : String(defaultValue),
});

export function subjectFields(
  defaults: Source & { name?: string; sortOrder?: number } = {},
  { withCode }: { withCode: boolean },
): CatalogFieldSpec[] {
  return [
    ...(withCode
      ? [
          {
            name: "code",
            label: "Ders kodu",
            kind: "text",
            hint: "Kalıcı kısa ad; sonradan değiştirilemez. Örnek: matematik.",
            maxLength: 32,
            code: true,
          } satisfies CatalogFieldSpec,
        ]
      : []),
    {
      name: "name",
      label: "Ders adı",
      kind: "text",
      maxLength: CATALOG_LIMITS.subjectName,
      defaultValue: defaults.name,
    },
    sortOrderField(defaults.sortOrder),
    ...sourceFields(defaults),
  ];
}

export function topicFields(
  defaults: Source & { name?: string; sortOrder?: number } = {},
): CatalogFieldSpec[] {
  return [
    {
      name: "name",
      label: "Konu adı",
      kind: "text",
      maxLength: CATALOG_LIMITS.topicName,
      defaultValue: defaults.name,
    },
    sortOrderField(defaults.sortOrder),
    ...sourceFields(defaults),
  ];
}

export function outcomeFields(
  defaults: Source & { code?: string; description?: string; sortOrder?: number } = {},
): CatalogFieldSpec[] {
  return [
    {
      name: "code",
      label: "Kazanım kodu",
      kind: "text",
      hint: "Programda yazdığı gibi. Örnek: M.8.1.1.1.",
      maxLength: 40,
      code: true,
      defaultValue: defaults.code,
    },
    {
      name: "description",
      label: "Kazanım açıklaması",
      kind: "textarea",
      maxLength: CATALOG_LIMITS.outcomeDescription,
      defaultValue: defaults.description,
    },
    sortOrderField(defaults.sortOrder),
    ...sourceFields(defaults),
  ];
}
