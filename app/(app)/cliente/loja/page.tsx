"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/empty-state";

/** Loja saiu do App do Cliente — redireciona para o hub limpo. */
export default function ClienteLojaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cliente");
  }, [router]);
  return <LoadingBlock label="Redirecionando…" />;
}
