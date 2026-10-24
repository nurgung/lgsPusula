export const SPECIES = [
  {
    code: "cat",
    kind: "animal",
    kindLabel: "Hayvan",
    name: "Kedi",
    description: "Sakin bir kedi.",
  },
  {
    code: "turtle",
    kind: "animal",
    kindLabel: "Hayvan",
    name: "Kaplumbağa",
    description: "Yavaş ve kararlı bir kaplumbağa.",
  },
  {
    code: "sparrow",
    kind: "animal",
    kindLabel: "Hayvan",
    name: "Serçe",
    description: "Küçük bir serçe.",
  },
  {
    code: "platypus",
    kind: "animal",
    kindLabel: "Hayvan",
    name: "Ornitorenk",
    description: "Geniş gagalı bir ornitorenk.",
  },
  {
    code: "capybara",
    kind: "animal",
    kindLabel: "Hayvan",
    name: "Kapibara",
    description: "Sakin ve iri bir kapibara.",
  },
  {
    code: "daisy",
    kind: "plant",
    kindLabel: "Bitki",
    name: "Papatya",
    description: "Sarı bir papatya.",
  },
  {
    code: "sapling",
    kind: "plant",
    kindLabel: "Bitki",
    name: "Fidan",
    description: "Yeni bir fidan.",
  },
] as const;

export type SpeciesCode = (typeof SPECIES)[number]["code"];

export function speciesByCode(code: string): (typeof SPECIES)[number] | undefined {
  return SPECIES.find((species) => species.code === code);
}

export function isSpeciesCode(code: string): code is SpeciesCode {
  return speciesByCode(code) !== undefined;
}
