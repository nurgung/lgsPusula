import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { unzip, zipStore } from "./zip";

describe("zip", () => {
  it("round-trips a stored file that contains Turkish text", () => {
    const packed = zipStore([
      { name: "word/document.xml", data: new TextEncoder().encode("Şişli, İstanbul") },
    ]);
    const files = unzip(packed);
    expect(new TextDecoder().decode(files.get("word/document.xml"))).toBe(
      "Şişli, İstanbul",
    );
  });

  it("reads a deflated entry", () => {
    const raw = new TextEncoder().encode("matematik");
    const compressed = deflateRawSync(raw);
    const stored = zipStore([{ name: "a.txt", data: compressed }]);
    // Rewrite the method flag of the only entry from store (0) to deflate (8).
    const patched = stored.slice();
    patched[8] = 8;
    const central = patched.lastIndexOf(0x50);
    // The central-directory method sits 10 bytes after its signature.
    const signature = [0x50, 0x4b, 0x01, 0x02];
    let at = -1;
    for (let index = 0; index < patched.length - 4; index += 1) {
      if (signature.every((byte, offset) => patched[index + offset] === byte)) at = index;
    }
    expect(at).toBeGreaterThan(0);
    patched[at + 10] = 8;
    expect(central).toBeGreaterThan(0);
    expect(new TextDecoder().decode(unzip(patched).get("a.txt"))).toBe("matematik");
  });
});
