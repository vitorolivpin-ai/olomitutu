import { MonthlyFeeDetail } from "@/components/finance/monthly-fee-detail";

export default async function MonthlyFeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MonthlyFeeDetail feeId={id} />;
}