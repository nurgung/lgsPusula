import { z } from "zod";
import { MAX_REMINDERS_PER_DAY } from "./constants";
import { normalizeClock } from "./notices";
import { SPECIES } from "./species";

const speciesCodes = SPECIES.map((species) => species.code) as [
  (typeof SPECIES)[number]["code"],
  ...(typeof SPECIES)[number]["code"][],
];

export const speciesSchema = z.object({
  species: z.enum(speciesCodes, { error: "Bir karakter seç." }),
});

const clockField = (label: string) =>
  z
    .string({ error: `${label} seç.` })
    .trim()
    .refine((value) => normalizeClock(value) !== null, `${label} seç.`);

export const notificationPreferencesSchema = z.object({
  enabled: z.enum(["acik", "kapali"], { error: "Hatırlatma seçimini yap." }),
  quietStart: clockField("Sessiz saat başlangıcı"),
  quietEnd: clockField("Sessiz saat bitişi"),
  maxPerDay: z.enum(
    Array.from({ length: MAX_REMINDERS_PER_DAY }, (_, index) => String(index + 1)) as [
      string,
      ...string[],
    ],
    { error: "Günde 1, 2 veya 3 hatırlatma seç." },
  ),
});

export function clockForDatabase(value: string): string {
  const clock = normalizeClock(value);
  if (!clock) throw new Error("Invalid clock.");
  return clock;
}
