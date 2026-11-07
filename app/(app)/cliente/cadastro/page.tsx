"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandPageHeader } from "@/components/brand/brand-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorMessage } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { isClientRegistrationComplete } from "@/lib/client-registration";

export default function ClienteCadastroPage() {
  const { state, currentUser, saveClientRegistration, logout } = useAppStore();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const client = state.clients.find((c) => c.id === currentUser?.client_id);

  useEffect(() => {
    if (!client && !currentUser) return;
    setFullName(client?.full_name || currentUser?.full_name || "");
    setBirthDate(client?.birth_date || "");
    setPhone(client?.phone || currentUser?.phone || "");
    setEmail(client?.email || currentUser?.email || "");
  }, [client, currentUser]);

  if (currentUser?.role !== "cliente" || !currentUser.client_id) {
    return <EmptyState title="Área exclusiva do cliente" />;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    const result = saveClientRegistration({
      full_name: fullName,
      birth_date: birthDate,
      phone,
      email,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk("Cadastro salvo.");
    router.replace("/cliente");
  }

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-5">
      <BrandPageHeader
        title="Meu cadastro"
        subtitle={
          isClientRegistrationComplete(client)
            ? "Atualize seus dados quando precisar"
            : "Preencha para a casa te conhecer"
        }
        backHref="/cliente"
        backLabel="Voltar ao início"
      />

      <Card>
        <CardTitle>Dados pessoais</CardTitle>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Como está no documento"
              required
            />
          </div>
          <div>
            <Label htmlFor="birth_date">Data de nascimento</Label>
            <Input
              id="birth_date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone / WhatsApp</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 90000-0000"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          {error ? <ErrorMessage message={error} /> : null}
          {ok ? <p className="text-sm text-success">{ok}</p> : null}
          <Button type="submit" variant="gold" className="w-full">
            Salvar cadastro
          </Button>
        </form>
      </Card>

      <div className="grid gap-2">
        <Link href="/cliente">
          <Button variant="secondary" className="w-full">
            Voltar para Quem somos
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            logout();
            router.replace("/");
          }}
        >
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
