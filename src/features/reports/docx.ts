import type { Block } from "./layout";
import { zipStore } from "@/features/files/zip";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function paragraph(text: string, bold: boolean): string {
  const run = bold ? "<w:rPr><w:b/></w:rPr>" : "";
  return `<w:p><w:r>${run}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function table(headers: string[], rows: string[][]): string {
  const cell = (value: string, header: boolean) =>
    `<w:tc><w:p><w:r>${header ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p></w:tc>`;
  const line = (values: string[], header: boolean) =>
    `<w:tr>${values.map((value) => cell(value, header)).join("")}</w:tr>`;
  return `<w:tbl>${line(headers, true)}${rows.map((row) => line(row, false)).join("")}</w:tbl>`;
}

function documentXml(blocks: readonly Block[]): string {
  const body = blocks
    .map((block) => {
      if (block.kind === "spacer") return "";
      if (block.kind === "text") return paragraph(block.text, block.bold);
      return table(
        block.columns.map((column) => column.header),
        block.rows,
      );
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;
}

/** A Word file built from the same blocks as the weekly PDF. It is not a public path. */
export function renderReportDocx(blocks: readonly Block[]): Uint8Array {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return zipStore([
    { name: "[Content_Types].xml", data: new TextEncoder().encode(contentTypes) },
    { name: "_rels/.rels", data: new TextEncoder().encode(rels) },
    { name: "word/document.xml", data: new TextEncoder().encode(documentXml(blocks)) },
  ]);
}
