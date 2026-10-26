import { test as base, expect } from "@playwright/test";
import { releaseTrackedE2eCatalog } from "./catalog.ts";

type E2eFixtures = {
  e2eCatalogCleanup: void;
};

/**
 * After each test, removes only the fictional catalog rows that test created.
 * Suite setup and teardown still sweep anything left when a run is interrupted.
 */
export const test = base.extend<E2eFixtures>({
  e2eCatalogCleanup: [
    async ({}, use) => {
      await use();
      await releaseTrackedE2eCatalog();
    },
    { auto: true },
  ],
});

export { expect };
