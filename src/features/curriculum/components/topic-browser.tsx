"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  describeSelection,
  type CatalogSelection,
  type CatalogSubject,
} from "../catalog";
import { CurriculumPicker } from "./curriculum-picker";

/** Read-only browsing: the picker plus the details of whatever is selected. */
export function TopicBrowser({ catalog }: { catalog: readonly CatalogSubject[] }) {
  const [selection, setSelection] = useState<CatalogSelection | null>(null);
  const item = selection ? describeSelection(catalog, selection) : null;

  return (
    <div className="grid gap-6">
      <Card>
        <CurriculumPicker
          catalog={catalog}
          name="konu"
          legend="Konu bul"
          onChange={setSelection}
        />
      </Card>

      {item ? (
        <Card
          title={item.outcome ? `Kazanım ${item.outcome.code}` : item.topic.name}
          description={`${item.subject.name} · ${item.topic.name}`}
        >
          {item.outcome ? (
            <p className="break-words text-ink-900">{item.outcome.description}</p>
          ) : item.topic.outcomes.length === 0 ? (
            <p className="text-ink-700">Bu konunun kazanımları henüz eklenmedi.</p>
          ) : (
            <ul className="grid gap-3">
              {item.topic.outcomes.map((outcome) => (
                <li key={outcome.id} className="grid gap-0.5">
                  <span className="font-semibold break-all text-ink-900">
                    {outcome.code}
                  </span>
                  <span className="break-words text-ink-700">{outcome.description}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
