import { PageLoader } from "@/components/brand/page-loader";

/** Loading de segmento — spinner discreto, sem brasão. */
export default function AppSegmentLoading() {
  return <PageLoader className="min-h-[50dvh]" delayMs={200} />;
}
