export type CatalogFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
    }
  | { status: "success"; message: string };

export const INITIAL_CATALOG_FORM_STATE: CatalogFormState = { status: "idle" };
