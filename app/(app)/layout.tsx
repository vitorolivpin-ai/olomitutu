import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RouteLoading } from "@/components/brand/route-loading";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RouteLoading />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
