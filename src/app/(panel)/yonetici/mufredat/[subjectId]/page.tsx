import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireAdmin } from "@/features/access/guards";
import {
  createOutcomeAction,
  createTopicAction,
  updateOutcomeAction,
  updateSubjectAction,
  updateTopicAction,
} from "@/features/curriculum/actions";
import type { CatalogTopic } from "@/features/curriculum/catalog";
import { ArchiveToggle } from "@/features/curriculum/components/archive-toggle";
import {
  ArchivedBadge,
  SourceLine,
} from "@/features/curriculum/components/archived-badge";
import {
  outcomeFields,
  subjectFields,
  topicFields,
} from "@/features/curriculum/components/catalog-fields";
import { CatalogForm } from "@/features/curriculum/components/catalog-form";
import { loadCatalog } from "@/features/curriculum/load-catalog";

export const metadata: Metadata = { title: "Ders düzenle" };
export const instant = false;

export default function SubjectAdminPage({
  params,
}: PageProps<"/yonetici/mufredat/[subjectId]">) {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Ders yükleniyor..." />}>
      <SubjectAdmin params={params} />
    </Suspense>
  );
}

function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 py-2 font-semibold text-brand-700">
        {summary}
      </summary>
      <div className="border-t border-border p-3">{children}</div>
    </details>
  );
}

async function SubjectAdmin({
  params,
}: Pick<PageProps<"/yonetici/mufredat/[subjectId]">, "params">) {
  const { subjectId } = await params;
  if (!z.uuid().safeParse(subjectId).success) notFound();

  await requireAdmin();
  const catalog = await loadCatalog({ includeArchived: true });
  const subject = catalog.find((item) => item.id === subjectId);
  if (!subject) notFound();

  return (
    <>
      <p className="mb-4">
        <Link
          href="/yonetici/mufredat"
          className="font-semibold text-brand-700 underline"
        >
          Tüm derslere dön
        </Link>
      </p>
      <PageHeader
        title={subject.name}
        description={`Ders kodu: ${subject.code}. Konuları ve kazanımları bu sayfada yönetirsin.`}
      />
      <div className="grid gap-6">
        <Card title="Ders bilgileri">
          <div className="grid gap-4">
            {subject.archived ? (
              <StateMessage
                variant="info"
                title="Bu ders eski sürüm."
                description="Öğrenci bu dersi ve altındaki konuları göremez."
              />
            ) : null}
            <SourceLine {...subject} />
            <CatalogForm
              action={updateSubjectAction}
              fields={subjectFields(subject, { withCode: false })}
              hidden={{ id: subject.id }}
              submitLabel="Dersi kaydet"
              pendingLabel="Kaydediliyor..."
              idPrefix="ders"
            />
            <ArchiveToggle
              entity="subject"
              id={subject.id}
              archived={subject.archived}
              itemLabel={subject.name}
            />
          </div>
        </Card>

        <Card title="Konu ekle">
          <CatalogForm
            action={createTopicAction}
            fields={topicFields({
              sourceName: subject.sourceName,
              sourceVersion: subject.sourceVersion,
            })}
            hidden={{ subjectId: subject.id }}
            submitLabel="Konuyu ekle"
            pendingLabel="Ekleniyor..."
            idPrefix="konu-ekle"
          />
        </Card>

        {subject.topics.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Bu derste henüz konu yok."
            description="Yukarıdaki formla ilk konuyu ekleyebilirsin."
          />
        ) : (
          subject.topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)
        )}
      </div>
    </>
  );
}

function TopicCard({ topic }: { topic: CatalogTopic }) {
  return (
    <Card>
      <div className="grid gap-4">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink-900">
            <span className="break-words">{topic.name}</span>
            {topic.archived ? <ArchivedBadge /> : null}
          </h2>
          <SourceLine {...topic} />
        </div>

        <Disclosure summary="Konuyu düzenle">
          <div className="grid gap-4">
            <CatalogForm
              action={updateTopicAction}
              fields={topicFields(topic)}
              hidden={{ id: topic.id }}
              submitLabel="Konuyu kaydet"
              pendingLabel="Kaydediliyor..."
              idPrefix={`konu-${topic.id}`}
            />
            <ArchiveToggle
              entity="topic"
              id={topic.id}
              archived={topic.archived}
              itemLabel={topic.name}
            />
          </div>
        </Disclosure>

        <section aria-label={`${topic.name} kazanımları`} className="grid gap-3">
          <h3 className="font-semibold text-ink-900">Kazanımlar</h3>
          {topic.outcomes.length === 0 ? (
            <p className="text-ink-700">Bu konuda henüz kazanım yok.</p>
          ) : (
            <ul className="grid gap-3">
              {topic.outcomes.map((outcome) => (
                <li
                  key={outcome.id}
                  className="grid min-w-0 gap-2 rounded-xl border border-border p-3"
                >
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                    <span className="break-all">{outcome.code}</span>
                    {outcome.archived ? <ArchivedBadge /> : null}
                  </p>
                  <p className="break-words text-ink-700">{outcome.description}</p>
                  <SourceLine {...outcome} />
                  <Disclosure summary="Kazanımı düzenle">
                    <div className="grid gap-4">
                      <CatalogForm
                        action={updateOutcomeAction}
                        fields={outcomeFields(outcome)}
                        hidden={{ id: outcome.id }}
                        submitLabel="Kazanımı kaydet"
                        pendingLabel="Kaydediliyor..."
                        idPrefix={`kazanim-${outcome.id}`}
                      />
                      <ArchiveToggle
                        entity="learning_outcome"
                        id={outcome.id}
                        archived={outcome.archived}
                        itemLabel={outcome.code}
                      />
                    </div>
                  </Disclosure>
                </li>
              ))}
            </ul>
          )}
          <Disclosure summary="Kazanım ekle">
            <CatalogForm
              action={createOutcomeAction}
              fields={outcomeFields({
                sourceName: topic.sourceName,
                sourceVersion: topic.sourceVersion,
              })}
              hidden={{ topicId: topic.id }}
              submitLabel="Kazanımı ekle"
              pendingLabel="Ekleniyor..."
              idPrefix={`kazanim-ekle-${topic.id}`}
            />
          </Disclosure>
        </section>
      </div>
    </Card>
  );
}
