import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingBlock } from "@/components/ui/empty-state";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
