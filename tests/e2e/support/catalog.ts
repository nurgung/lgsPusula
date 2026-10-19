import { randomBytes } from "node:crypto";
import { admin } from "./auth.ts";

/** Subjects created by tests use this code prefix so they can be found and removed. */
export const E2E_SUBJECT_PREFIX = "e2e_";

export type SeededCatalog = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  outcomeId: string;
  topicName: string;
  outcomeCode: string;
};

/** Fictional catalog rows, unique per test, written with the service role. */
export async function seedCatalog(): Promise<SeededCatalog> {
  const tag = randomBytes(4).toString("hex");
  const source = { source_name: "Kurgusal test kaynağı", source_version: "e2e" };
  const subjectName = `E2E Ders ${tag}`;
  const { data: subject, error: subjectError } = await admin()
    .from("subjects")
    .insert({ code: `${E2E_SUBJECT_PREFIX}${tag}`, name: subjectName, ...source })
    .select("id")
    .single<{ id: string }>();
  if (subjectError || !subject)
    throw new Error(`seed subject failed (${subjectError?.code})`);

  const topicName = `E2E Konu ${tag}`;
  const { data: topic, error: topicError } = await admin()
    .from("topics")
    .insert({ subject_id: subject.id, name: topicName, ...source })
    .select("id")
    .single<{ id: string }>();
  if (topicError || !topic) throw new Error(`seed topic failed (${topicError?.code})`);

  const outcomeCode = `E2E.${tag}.1`;
  const { data: outcome, error: outcomeError } = await admin()
    .from("learning_outcomes")
    .insert({
      topic_id: topic.id,
      code: outcomeCode,
      description: "Kurgusal test kazanımı",
      ...source,
    })
    .select("id")
    .single<{ id: string }>();
  if (outcomeError || !outcome)
    throw new Error(`seed outcome failed (${outcomeError?.code})`);

  return {
    subjectId: subject.id,
    subjectName,
    topicId: topic.id,
    outcomeId: outcome.id,
    topicName,
    outcomeCode,
  };
}

/** Removes catalog rows left by earlier runs: outcomes, then topics, then subjects. */
export async function deleteE2eCatalog() {
  const client = admin();
  const { data: subjects, error } = await client
    .from("subjects")
    .select("id")
    .like("code", `${E2E_SUBJECT_PREFIX}%`);
  if (error) throw new Error(`reading e2e subjects failed (${error.code})`);
  const subjectIds = (subjects ?? []).map((row: { id: string }) => row.id);
  if (subjectIds.length === 0) return;

  const removedLogs = await client
    .from("study_logs")
    .delete()
    .in("subject_id", subjectIds);
  if (removedLogs.error) {
    throw new Error(`deleting e2e study logs failed (${removedLogs.error.code})`);
  }
  const removedGoals = await client
    .from("study_goals")
    .delete()
    .in("subject_id", subjectIds);
  if (removedGoals.error) {
    throw new Error(`deleting e2e study goals failed (${removedGoals.error.code})`);
  }

  const { data: topics, error: topicError } = await client
    .from("topics")
    .select("id")
    .in("subject_id", subjectIds);
  if (topicError) throw new Error(`reading e2e topics failed (${topicError.code})`);
  const topicIds = (topics ?? []).map((row: { id: string }) => row.id);

  if (topicIds.length > 0) {
    const removedOutcomes = await client
      .from("learning_outcomes")
      .delete()
      .in("topic_id", topicIds);
    if (removedOutcomes.error) {
      throw new Error(`deleting e2e outcomes failed (${removedOutcomes.error.code})`);
    }
    const removedTopics = await client.from("topics").delete().in("id", topicIds);
    if (removedTopics.error) {
      throw new Error(`deleting e2e topics failed (${removedTopics.error.code})`);
    }
  }
  const removedSubjects = await client.from("subjects").delete().in("id", subjectIds);
  if (removedSubjects.error) {
    throw new Error(`deleting e2e subjects failed (${removedSubjects.error.code})`);
  }
}
