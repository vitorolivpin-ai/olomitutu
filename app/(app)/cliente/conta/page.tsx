"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/empty-state";

/** Conta do cliente redireciona para o cadastro unificado. */
export default function ClienteContaPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cliente/cadastro");
  }, [router]);
  return <LoadingBlock label="Abrindo cadastro..." />;
}
