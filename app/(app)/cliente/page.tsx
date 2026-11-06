"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/empty-state";

/** App do Cliente passou a ser marcação pública sem conta. */
export default function ClienteHomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/marcar");
  }, [router]);
  return <LoadingBlock label="Abrindo marcação…" />;
}
