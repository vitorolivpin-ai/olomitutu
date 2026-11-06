import { HubLanding } from "@/components/hub/hub-landing";
import { HUB_ENTRIES } from "@/lib/hub-entries";

/**
 * Hub: emblema + atalhos públicos visíveis + menu (público e restrito).
 */
export default function HubPage() {
  return <HubLanding entries={HUB_ENTRIES} />;
}
