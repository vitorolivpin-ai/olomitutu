import { PageLoader } from "@/components/brand/page-loader";

/** Loading leve entre rotas públicas — sem brasão. */
export default function RootSegmentLoading() {
  return <PageLoader className="min-h-dvh" delayMs={200} />;
}
