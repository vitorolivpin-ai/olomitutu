"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/empty-state";

export default function ClienteEducacaoRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cliente");
  }, [router]);
  return <LoadingBlock label="Redirecionando…" />;
}
