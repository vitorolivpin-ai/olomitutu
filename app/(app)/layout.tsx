import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AppSplash } from "@/components/brand/app-splash";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppSplash />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
