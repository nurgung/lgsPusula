import { inflateRawSync } from "node:zlib";

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipError";
  }
}

export type ZipEntry = { name: string; data: Uint8Array };

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function bytesOf(parts: number[]): Uint8Array {
  return Uint8Array.from(parts);
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

/** Writes an uncompressed zip. Office files open stored entries. */
export function zipStore(entries: readonly ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: number[] = [];
  let offset = 0;
  for (const entry of entries) {
    if (entry.name.includes("\\") || entry.name.startsWith("/")) {
      throw new ZipError("zip_name");
    }
    const name = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const local = bytesOf([
      0x50,
      0x4b,
      0x03,
      0x04,
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(entry.data.byteLength),
      ...u32(entry.data.byteLength),
      ...u16(name.byteLength),
      ...u16(0),
    ]);
    locals.push(local, name, entry.data);
    centrals.push(
      0x50,
      0x4b,
      0x01,
      0x02,
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(entry.data.byteLength),
      ...u32(entry.data.byteLength),
      ...u16(name.byteLength),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...name,
    );
    offset += local.byteLength + name.byteLength + entry.data.byteLength;
  }
  const central = bytesOf(centrals);
  const end = bytesOf([
    0x50,
    0x4b,
    0x05,
    0x06,
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.byteLength),
    ...u32(offset),
    ...u16(0),
  ]);
  const size = offset + central.byteLength + end.byteLength;
  const out = new Uint8Array(size);
  let cursor = 0;
  for (const part of locals) {
    out.set(part, cursor);
    cursor += part.byteLength;
  }
  out.set(central, cursor);
  cursor += central.byteLength;
  out.set(end, cursor);
  return out;
}

/** Reads stored and deflated entries. Other methods are refused. */
export function unzip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  const scanFrom = Math.max(0, bytes.byteLength - 66_000);
  for (let index = bytes.byteLength - 22; index >= scanFrom; index -= 1) {
    if (readU32(view, index) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new ZipError("zip_end");
  const count = readU16(view, end + 10);
  let cursor = readU32(view, end + 16);
  const files = new Map<string, Uint8Array>();
  for (let index = 0; index < count; index += 1) {
    if (readU32(view, cursor) !== 0x02014b50) throw new ZipError("zip_central");
    const method = readU16(view, cursor + 10);
    const compressed = readU32(view, cursor + 20);
    const nameLength = readU16(view, cursor + 28);
    const extraLength = readU16(view, cursor + 30);
    const commentLength = readU16(view, cursor + 32);
    const localOffset = readU32(view, cursor + 42);
    const name = new TextDecoder().decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    );
    if (readU32(view, localOffset) !== 0x04034b50) throw new ZipError("zip_local");
    const localName = readU16(view, localOffset + 26);
    const localExtra = readU16(view, localOffset + 28);
    const start = localOffset + 30 + localName + localExtra;
    const payload = bytes.subarray(start, start + compressed);
    let data: Uint8Array;
    if (method === 0) data = payload;
    else if (method === 8) data = inflateRawSync(payload);
    else throw new ZipError("zip_method");
    files.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}
