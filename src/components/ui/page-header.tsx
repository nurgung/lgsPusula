import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-extrabold break-words text-ink-900 sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-prose break-words text-base text-ink-700">
          {description}
        </p>
      ) : null}
    </header>
  );
}
