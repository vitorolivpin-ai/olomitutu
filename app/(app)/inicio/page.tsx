"use client";

import Link from "next/link";
import { EnablePushBanner } from "@/components/chat/enable-push-banner";
import { AdminOverview } from "@/components/house/admin-overview";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";

export default function CasaInicioPage() {
  const { currentUser } = useAppStore();

  if (!currentUser || currentUser.role === "cliente") {
    return <EmptyState title="Área da casa" />;
  }

  // Admin, Financeiro e Pai: grid com todas as abas liberadas (sem App do Cliente)
  if (
    currentUser.role === "administrador" ||
    currentUser.role === "tesouraria" ||
    currentUser.role === "pai_de_santo"
  ) {
    return (
      <div className="space-y-4">
        {currentUser.role === "pai_de_santo" ||
        currentUser.role === "administrador" ? (
          <EnablePushBanner />
        ) : null}
        <AdminOverview />
        <Link href="/">
          <Button variant="ghost" className="w-full">
            Menu principal
          </Button>
        </Link>
      </div>
    );
  }

  return <EmptyState title="Área da casa" />;
}
