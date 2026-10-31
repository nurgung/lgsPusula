/** Report PDF files are kept for one day (decision 0.5). */
export const REPORT_TTL_MS = 24 * 60 * 60 * 1000;

export const REPORT_TYPES = ["weekly_pdf", "monthly_pdf"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** @deprecated Prefer REPORT_TYPES / explicit reportType. Kept for weekly call sites. */
export const REPORT_TYPE = "weekly_pdf" as const;

/** Matches the database check. A shorter file is treated as empty. */
export const MIN_PDF_BYTES = 400;

/** Matches the database check. A larger file is refused. */
export const MAX_PDF_BYTES = 1_500_000;

export const PDF_HEADER = "%PDF-";

export const REPORT_FAILURES = ["generation_failed", "empty_document"] as const;
export type ReportFailureCode = (typeof REPORT_FAILURES)[number];
