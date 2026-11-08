"use client";

import { BootSplashClear } from "@/components/brand/boot-splash-clear";
import { AppStoreProvider } from "@/hooks/use-app-store";
import { WorkshopsProvider } from "@/hooks/use-workshops";

export function Providers({
  children,
  initialUserId = null,
}: {
  children: React.ReactNode;
  initialUserId?: string | null;
}) {
  return (
    <AppStoreProvider initialUserId={initialUserId}>
      <WorkshopsProvider>
        <BootSplashClear />
        {children}
      </WorkshopsProvider>
    </AppStoreProvider>
  );
}
