"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/empty-state";

export default function ClienteHorariosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/marcar");
  }, [router]);
  return <LoadingBlock label="Abrindo marcação…" />;
}
