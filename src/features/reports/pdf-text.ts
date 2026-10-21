import { inflateSync } from "node:zlib";

function latin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

function* pdfStreams(bytes: Uint8Array): Generator<Uint8Array> {
  const raw = Buffer.from(bytes);
  let index = 0;
  while (index < raw.length) {
    const start = raw.indexOf("stream", index);
    if (start < 0) return;
    let dataStart = start + "stream".length;
    if (raw[dataStart] === 0x0d && raw[dataStart + 1] === 0x0a) dataStart += 2;
    else if (raw[dataStart] === 0x0a) dataStart += 1;
    const end = raw.indexOf("endstream", dataStart);
    if (end < 0) return;
    let dataEnd = end;
    if (raw[dataEnd - 1] === 0x0a) dataEnd -= 1;
    if (raw[dataEnd - 1] === 0x0d) dataEnd -= 1;
    const dictStart = raw.lastIndexOf("<<", start);
    const dict = dictStart >= 0 ? raw.subarray(dictStart, start).toString("latin1") : "";
    let data = raw.subarray(dataStart, dataEnd);
    if (dict.includes("FlateDecode")) {
      try {
        data = Buffer.from(inflateSync(data));
      } catch {
        // Keep the raw bytes; a non-font stream is ignored below.
      }
    }
    yield data;
    index = end + "endstream".length;
  }
}

function addUtf16(hex: string, into: Set<number>) {
  if (hex.length < 4 || hex.length % 4 !== 0) return;
  const units: number[] = [];
  for (let index = 0; index < hex.length; index += 4) {
    units.push(Number.parseInt(hex.slice(index, index + 4), 16));
  }
  const text = String.fromCharCode(...units);
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code !== undefined) into.add(code);
  }
}

function parseCmap(source: string, into: Set<number>) {
  const bfchar = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
  for (const match of source.matchAll(bfchar)) {
    const destination = match[2];
    if (destination) addUtf16(destination, into);
  }
  const range = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
  for (const match of source.matchAll(range)) {
    const start = Number.parseInt(match[1] ?? "", 16);
    const end = Number.parseInt(match[2] ?? "", 16);
    const first = match[3] ?? "";
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end < start ||
      end - start > 500
    ) {
      continue;
    }
    const origin = Number.parseInt(first, 16);
    if (!Number.isFinite(origin)) continue;
    for (let offset = 0; offset <= end - start; offset += 1) {
      into.add(origin + offset);
    }
  }
}

/** Unicode scalars that a subset font's ToUnicode map says were used. */
export function unicodeScalarsInPdf(bytes: Uint8Array): Set<number> {
  const scalars = new Set<number>();
  for (const stream of pdfStreams(bytes)) {
    const text = latin1(stream);
    if (!text.includes("beginbfchar") && !text.includes("beginbfrange")) continue;
    parseCmap(text, scalars);
  }
  return scalars;
}

export function pdfContainsText(bytes: Uint8Array, value: string): boolean {
  const scalars = unicodeScalarsInPdf(bytes);
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined || !scalars.has(code)) return false;
  }
  return value.length > 0;
}

/** Page dictionaries stay uncompressed when object streams are off. */
export function pdfPageCount(bytes: Uint8Array): number {
  const matches = latin1(bytes).match(/\/Type\s*\/Page(?!s)/g);
  return matches?.length ?? 0;
}
