import { SettingsView } from "@/components/settings/SettingsView";

export const metadata = {
  title: "Settings",
  description: "Configure your AI provider, daily nutrition targets, body profile, and Google sync.",
  alternates: { canonical: "/settings" },
};

export default function Page() {
  return <SettingsView />;
}
