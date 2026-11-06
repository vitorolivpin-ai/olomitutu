"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/empty-state";

export default function ClienteFinanceiroChatRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cliente/mensagens");
  }, [router]);
  return <LoadingBlock label="Redirecionando…" />;
}
