import { Suspense, type ReactNode } from "react";
import { CelebrationGate } from "@/features/home/components/celebration-gate";

export default function StudentSectionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <CelebrationGate />
      </Suspense>
    </>
  );
}
