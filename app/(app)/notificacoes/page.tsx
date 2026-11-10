"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { InternalNoticesPage } from "@/components/notices/internal-notices-page";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <InternalNoticesPage />
      <div className="flex justify-end">
        <Link href="/notificacoes/sistema">
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" /> Notificações do sistema
          </Button>
        </Link>
      </div>
    </div>
  );
}
