import { redirect } from "next/navigation";

export default async function ChargeDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/mensalidades/${encodeURIComponent(id)}`);
}