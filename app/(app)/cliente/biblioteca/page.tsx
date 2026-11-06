"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/empty-state";

export default function ClienteBibliotecaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/acervo");
  }, [router]);
  return <LoadingBlock label="Abrindo biblioteca…" />;
}
