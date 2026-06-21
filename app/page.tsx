import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata = {
  title: "Journal",
  description: "Log today's meals and let AI fill in the calories, protein, carbs, fat, and fiber.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <Dashboard />;
}
