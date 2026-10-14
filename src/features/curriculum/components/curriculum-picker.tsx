"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import {
  decodeSelection,
  describeSelection,
  searchCatalog,
  type CatalogSelection,
  type CatalogSubject,
} from "../catalog";

/**
 * Searchable topic/outcome picker. Results are native radio buttons, so arrow keys, Tab and
 * screen readers work without custom keyboard handling. The chosen value is kept in a hidden
 * input (`topic:<id>` or `outcome:<id>`), so it survives when the list is filtered again.
 * The server must still check that the id exists and is not archived.
 */
export function CurriculumPicker({
  catalog,
  name = "catalogItem",
  legend = "Konu veya kazanım",
  optional = false,
  defaultValue = "",
  onChange,
}: {
  /** Pass only rows that are not archived. */
  catalog: readonly CatalogSubject[];
  name?: string;
  legend?: string;
  optional?: boolean;
  defaultValue?: string;
  onChange?: (selection: CatalogSelection | null) => void;
}) {
  const prefix = useId();
  const [subjectId, setSubjectId] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() =>
    decodeSelection(defaultValue) ? defaultValue : "",
  );

  const { results, total } = useMemo(
    () => searchCatalog(catalog, { query, subjectId: subjectId || undefined }),
    [catalog, query, subjectId],
  );
  const selection = decodeSelection(selected);
  const selectedItem = selection ? describeSelection(catalog, selection) : null;

  const choose = (value: string) => {
    setSelected(value);
    onChange?.(decodeSelection(value));
  };

  const idle = !subjectId && query.trim() === "";
  const status = idle
    ? "Bir ders seç ya da aramaya başla."
    : total === 0
      ? "Sonuç bulunamadı. Başka bir kelime dene."
      : total > results.length
        ? `${total} sonuç var, ilk ${results.length} tanesi gösteriliyor. Aramayı daraltabilirsin.`
        : `${total} sonuç bulundu.`;

  return (
    <fieldset className="grid min-w-0 gap-4">
      <legend className="mb-2 text-lg font-bold text-ink-900">
        {legend}
        {optional ? (
          <>
            {" "}
            <span className="font-normal text-ink-600">(isteğe bağlı)</span>
          </>
        ) : null}
      </legend>
      <input type="hidden" name={name} value={selected} />

      {catalog.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Konu listesi henüz hazır değil."
          description="Yönetici dersleri ve konuları ekleyince burada seçebileceksin."
        />
      ) : (
        <>
          <SelectField
            id={`${prefix}-ders`}
            label="Ders"
            optional
            placeholder="Tüm dersler"
            options={catalog.map((subject) => ({
              value: subject.id,
              label: subject.name,
            }))}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          />
          <TextField
            id={`${prefix}-ara`}
            type="search"
            label="Ara"
            optional
            hint="Konu adı, kazanım kodu ya da bir kelime yaz. Türkçe karakter yazmasan da bulur."
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {selectedItem ? (
            <div className="grid gap-2 rounded-xl border-2 border-brand-600 bg-brand-50 p-3">
              <p className="font-semibold text-ink-900">
                Seçilen:{" "}
                {selectedItem.outcome
                  ? `${selectedItem.outcome.code} — ${selectedItem.outcome.description}`
                  : selectedItem.topic.name}
              </p>
              <p className="text-sm text-ink-700">
                {selectedItem.subject.name} · {selectedItem.topic.name}
              </p>
              <div>
                <Button variant="ghost" onClick={() => choose("")}>
                  Seçimi kaldır
                </Button>
              </div>
            </div>
          ) : null}

          <p role="status" className="text-sm text-ink-700">
            {status}
          </p>

          {results.length > 0 ? (
            <ul className="grid gap-2" aria-label="Sonuçlar">
              {results.map((result) => {
                const inputId = `${prefix}-${result.value}`;
                return (
                  <li key={result.value}>
                    <label
                      htmlFor={inputId}
                      className="flex min-h-11 min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-brand-50 has-[:checked]:border-2 has-[:checked]:border-brand-600"
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={`${prefix}-sonuc`}
                        value={result.value}
                        checked={selected === result.value}
                        onChange={() => choose(result.value)}
                        className="mt-1 size-5 shrink-0"
                      />
                      <span className="grid min-w-0 gap-0.5">
                        {result.kind === "outcome" ? (
                          <>
                            <span className="font-semibold break-all text-ink-900">
                              Kazanım {result.outcomeCode}
                            </span>
                            <span className="break-words text-ink-700">
                              {result.outcomeDescription}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold break-words text-ink-900">
                            Konu: {result.topicName}
                          </span>
                        )}
                        <span className="text-sm break-words text-ink-600">
                          {result.kind === "outcome"
                            ? `${result.subjectName} · ${result.topicName}`
                            : result.subjectName}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      )}
    </fieldset>
  );
}
