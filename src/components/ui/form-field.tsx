import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlClassName =
  "block min-h-11 w-full min-w-0 rounded-xl border bg-surface px-3 py-2 text-base text-ink-900 placeholder:text-ink-600 disabled:cursor-not-allowed disabled:bg-canvas";

type FieldOwnProps = {
  label: string;
  hint?: ReactNode;
  /** Message shown next to the field; also marks the control as invalid. */
  error?: string;
  /** Adds "(isteğe bağlı)" to the label. Fields are required by default in our forms. */
  optional?: boolean;
  className?: string;
};

type FieldIds = { controlId: string; hintId?: string; errorId?: string };

function useFieldIds(id: string | undefined, hint: unknown, error: unknown): FieldIds {
  const generated = useId();
  const controlId = id ?? generated;
  return {
    controlId,
    hintId: hint ? `${controlId}-ipucu` : undefined,
    errorId: error ? `${controlId}-hata` : undefined,
  };
}

function describedBy(ids: FieldIds, external?: string) {
  return [ids.hintId, ids.errorId, external].filter(Boolean).join(" ") || undefined;
}

function FieldShell({
  ids,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldOwnProps & { ids: FieldIds; children: ReactNode }) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <label htmlFor={ids.controlId} className="font-semibold text-ink-900">
        {label}
        {optional ? (
          <>
            {" "}
            <span className="font-normal text-ink-600">(isteğe bağlı)</span>
          </>
        ) : null}
      </label>
      {hint ? (
        <p id={ids.hintId} className="text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={ids.errorId}
          className="flex items-start gap-1.5 text-sm font-semibold text-danger-700"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <span>
            <span className="sr-only">Hata: </span>
            {error}
          </span>
        </p>
      ) : null}
      {children}
    </div>
  );
}

function controlState(error: string | undefined) {
  return error ? "border-danger-700 border-2" : "border-border hover:border-ink-600";
}

type TextFieldProps = FieldOwnProps &
  Omit<ComponentProps<"input">, "className" | "children">;

export function TextField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  "aria-describedby": externalDescribedBy,
  ...inputProps
}: TextFieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell {...{ ids, label, hint, error, optional, className }}>
      <input
        id={ids.controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, externalDescribedBy)}
        className={cn(controlClassName, controlState(error))}
        {...inputProps}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = FieldOwnProps &
  Omit<ComponentProps<"textarea">, "className" | "children">;

export function TextAreaField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  rows = 3,
  "aria-describedby": externalDescribedBy,
  ...textareaProps
}: TextAreaFieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell {...{ ids, label, hint, error, optional, className }}>
      <textarea
        id={ids.controlId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, externalDescribedBy)}
        className={cn(controlClassName, controlState(error), "resize-y")}
        {...textareaProps}
      />
    </FieldShell>
  );
}

type NumberFieldProps = FieldOwnProps &
  Omit<ComponentProps<"input">, "className" | "children" | "type" | "inputMode"> & {
    /** Unit shown after the input, e.g. "soru" or "dk". Read with the label. */
    unit?: string;
    allowDecimal?: boolean;
  };

/**
 * Uses `type="text"` with a numeric `inputMode` instead of `type="number"`: it opens the
 * numeric keyboard on mobile without scroll-wheel changes or "e"/"-" being accepted silently.
 * Values must still be validated with a shared schema on the server.
 */
export function NumberField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  unit,
  allowDecimal = false,
  "aria-describedby": externalDescribedBy,
  ...inputProps
}: NumberFieldProps) {
  const ids = useFieldIds(id, hint, error);
  const unitId = unit ? `${ids.controlId}-birim` : undefined;
  return (
    <FieldShell {...{ ids, label, hint, error, optional, className }}>
      <div className="flex min-w-0 items-center gap-2">
        <input
          id={ids.controlId}
          type="text"
          inputMode={allowDecimal ? "decimal" : "numeric"}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            ids,
            [unitId, externalDescribedBy].filter(Boolean).join(" "),
          )}
          className={cn(controlClassName, controlState(error), "max-w-40 tabular-nums")}
          {...inputProps}
        />
        {unit ? (
          <span id={unitId} className="text-ink-700">
            {unit}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

type SelectFieldProps = FieldOwnProps &
  Omit<ComponentProps<"select">, "className" | "children"> & {
    options: readonly { value: string; label: string }[];
    /** Text for an empty first option; omit when a value is always selected. */
    placeholder?: string;
  };

export function SelectField({
  id,
  label,
  hint,
  error,
  optional,
  className,
  options,
  placeholder,
  "aria-describedby": externalDescribedBy,
  ...selectProps
}: SelectFieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell {...{ ids, label, hint, error, optional, className }}>
      <select
        id={ids.controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, externalDescribedBy)}
        className={cn(controlClassName, controlState(error))}
        {...selectProps}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export type FormErrorItem = { fieldId: string; message: string };

/**
 * Error summary shown at the top of a form after a failed submit. Announced as an alert
 * and links each message to its field so keyboard users can jump straight to it.
 */
export function FormErrorSummary({
  errors,
  title = "Formda düzeltilmesi gereken alanlar var.",
}: {
  errors: readonly FormErrorItem[];
  title?: string;
}) {
  if (errors.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-card border-2 border-danger-700 bg-danger-50 p-4 text-danger-700"
    >
      <p className="font-bold">{title}</p>
      <ul className="mt-2 list-disc pl-5">
        {errors.map((item) => (
          <li key={item.fieldId}>
            <a
              href={`#${item.fieldId}`}
              className="font-semibold underline underline-offset-2"
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
