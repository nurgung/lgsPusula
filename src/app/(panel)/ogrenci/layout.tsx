import { Suspense, type ReactNode } from "react";
import { CelebrationGate } from "@/features/home/components/celebration-gate";
import { PracticeCheerGate } from "@/features/home/components/practice-cheer-gate";

export default function StudentSectionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <CelebrationGate />
        <PracticeCheerGate />
      </Suspense>
    </>
  );
}
