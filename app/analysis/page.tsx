import { AnalysisView } from "@/components/analysis/AnalysisView";

export const metadata = {
  title: "Analysis",
  description: "Detailed nutrition stats, weekly trends, and a monthly calendar of which goals you met each day.",
  alternates: { canonical: "/analysis" },
};

export default function Page() {
  return <AnalysisView />;
}
