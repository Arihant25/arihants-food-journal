"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { AiProvider, DailyGoals, NUTRIENTS, Nutrient, Profile } from "@/lib/types";
import { NUTRIENT_META, goalsFromProfile } from "@/lib/nutrition";
import { discoverModels, recommendGoals } from "@/lib/ai/client";

const PROVIDERS: { id: AiProvider; label: string; keyLabel?: string; keyHelp?: string; keyUrl?: string; modelHint?: string }[] = [
  { id: "anthropic", label: "Claude", keyLabel: "Anthropic API key", keyHelp: "console.anthropic.com", keyUrl: "https://console.anthropic.com/settings/keys", modelHint: "claude-opus-4-8" },
  { id: "openai", label: "ChatGPT", keyLabel: "OpenAI API key", keyHelp: "platform.openai.com", keyUrl: "https://platform.openai.com/api-keys", modelHint: "gpt-5.1" },
  { id: "gemini", label: "Gemini", keyLabel: "Google AI Studio key", keyHelp: "aistudio.google.com", keyUrl: "https://aistudio.google.com/apikey", modelHint: "gemini-3.5-flash" },
  { id: "openrouter", label: "OpenRouter", keyLabel: "OpenRouter API key", keyHelp: "openrouter.ai", keyUrl: "https://openrouter.ai/keys", modelHint: "anthropic/claude-..." },
  { id: "xai", label: "Grok (xAI)", keyLabel: "xAI API key", keyHelp: "console.x.ai", keyUrl: "https://console.x.ai", modelHint: "grok-..." },
  { id: "ollama", label: "Local · Ollama" },
];

const ACTIVITY: { id: Profile["activity"]; label: string }[] = [
  { id: "sedentary", label: "Sedentary" },
  { id: "light", label: "Lightly active" },
  { id: "moderate", label: "Moderately active" },
  { id: "active", label: "Active" },
  { id: "very_active", label: "Very active" },
];

const DEFAULT_PROFILE: Profile = { sex: "male", age: 30, heightCm: 175, weightKg: 70, activity: "moderate", goal: "maintain" };

export function SettingsView() {
  const { ready } = useStore();
  if (!ready) return <div className="h-96 animate-pulse rounded-organic bg-paper-deep" />;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-ink-soft">Choose your AI assistant, set your daily targets, and back up your journal.</p>
      </header>
      <AiSection />
      <TargetsSection />
      <AccountSection />
      <ExportSection />
      <DangerSection />
    </div>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-organic border border-line bg-surface p-5 shadow-[0_1px_3px_#2b272210] sm:p-6">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {description && <p className="mt-1 mb-4 text-sm text-ink-soft">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

/* --------------------------------- AI ------------------------------------- */

function AiSection() {
  const { settings, updateSettings } = useStore();
  const { user } = useSession();
  const ai = settings.ai;
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = PROVIDERS.find((p) => p.id === ai.provider)!;
  const selectedModel = ai.provider === "ollama" ? ai.models.ollama ?? "" : ai.models[ai.provider] ?? "";

  const [showKey, setShowKey] = useState(false);

  const setAi = (patch: Partial<typeof ai>) => updateSettings({ ai: { ...ai, ...patch } });
  const setProvider = (id: AiProvider) => {
    setModels([]);
    setError(null);
    setShowKey(false);
    setAi({ provider: id });
  };
  const setKey = (value: string) => setAi({ apiKeys: { ...ai.apiKeys, [ai.provider]: value } });
  const setModel = (value: string) =>
    setAi({ models: { ...ai.models, [ai.provider]: value } });

  async function fetchModels() {
    setError(null);
    setLoading(true);
    try {
      const list = await discoverModels(ai);
      setModels(list);
      if (list.length && !selectedModel) setModel(list[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch models.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="AI assistant" description="Used to estimate nutrition and suggest your daily targets. Keys are stored only on this device by default.">
      <div role="radiogroup" aria-label="AI provider" className="flex flex-wrap gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={ai.provider === p.id}
            onClick={() => setProvider(p.id)}
            className={`rounded-pill px-4 py-2 text-sm font-medium transition ${ai.provider === p.id ? "bg-herb text-paper shadow-sm" : "border border-line bg-surface text-ink-soft hover:border-herb"
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {ai.provider === "ollama" ? (
          <Field label="Ollama server address">
            <input
              value={ai.ollamaBaseUrl}
              onChange={(e) => setAi({ ollamaBaseUrl: e.target.value })}
              placeholder="http://localhost:11434"
              className={inputClass}
            />
            <OllamaHelp />
          </Field>
        ) : (
          <Field label={provider.keyLabel ?? "API key"}>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={ai.apiKeys[ai.provider] ?? ""}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste your key"
                autoComplete="off"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint hover:text-ink transition"
              >
                {showKey ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {provider.keyUrl && (
              <p className="mt-1.5 text-xs text-ink-faint">
                Get a key at{" "}
                <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="text-herb underline">
                  {provider.keyHelp}
                </a>
              </p>
            )}
          </Field>
        )}

        <Field label="Model">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={selectedModel}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider.modelHint ?? "model name"}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={fetchModels}
              disabled={loading}
              className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-medium text-herb transition hover:border-herb disabled:opacity-50"
            >
              {loading ? "Loading…" : ai.provider === "ollama" ? "Discover installed" : "Fetch models"}
            </button>
          </div>
          {models.length > 0 && (
            <>
              <select
                value={models.includes(selectedModel) ? selectedModel : ""}
                onChange={(e) => setModel(e.target.value)}
                className={`${inputClass} mt-2`}
              >
                <option value="" disabled>
                  Pick from {models.length} fetched model{models.length > 1 ? "s" : ""}…
                </option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-ink-faint">Or type a model name above to use one not in the list.</p>
            </>
          )}
        </Field>

        {ai.provider !== "ollama" && (
          <label className="flex items-start gap-2.5 rounded-lg border border-line bg-paper/50 p-3">
            <input
              type="checkbox"
              checked={ai.syncKeys ?? false}
              onChange={(e) => setAi({ syncKeys: e.target.checked })}
              disabled={!user}
              className="mt-0.5 h-4 w-4 accent-herb disabled:opacity-50"
            />
            <span className="text-sm">
              <span className="font-medium text-ink">Sync API keys to my account</span>
              <span className="mt-0.5 block text-xs text-ink-faint">
                {user
                  ? "Stores your keys in the cloud so they follow you across devices. Turn off to remove them from the cloud."
                  : "Sign in to enable cloud key sync."}
              </span>
            </span>
          </label>
        )}

        {error && <p className="text-sm text-protein">{error}</p>}
      </div>
    </Card>
  );
}

function OllamaHelp() {
  return (
    <details className="mt-2 rounded-lg bg-paper-deep/50 px-3 py-2 text-xs text-ink-soft">
      <summary className="cursor-pointer font-medium text-ink">Browser can&rsquo;t reach Ollama?</summary>
      <p className="mt-2">
        Ollama is called from your browser, so it must allow this site. Start Ollama with the origin allowed:
      </p>
      <pre className="mt-2 overflow-x-auto rounded bg-ink/90 px-3 py-2 font-mono text-[0.7rem] text-paper">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</pre>
      <p className="mt-2">Then use your machine&rsquo;s address (e.g. <code>http://localhost:11434</code>) above and click Discover installed.</p>
    </details>
  );
}

/* ------------------------------- targets ---------------------------------- */

function TargetsSection() {
  const { settings, updateSettings } = useStore();
  const profile = settings.profile ?? DEFAULT_PROFILE;
  const [aiBusy, setAiBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ goals: DailyGoals; note?: string } | null>(null);

  const setGoal = (n: Nutrient, v: number) => updateSettings({ goals: { ...settings.goals, [n]: v } });
  const setProfile = (patch: Partial<Profile>) => updateSettings({ profile: { ...profile, ...patch } });

  function calcFromProfile() {
    setNote(null);
    setError(null);
    updateSettings({ goals: goalsFromProfile(profile) });
  }

  async function aiSuggest() {
    setError(null);
    setNote(null);
    setAiBusy(true);
    try {
      const { note: n, ...goals } = await recommendGoals(profile, settings.ai);
      setSuggestion({ goals, note: n });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get a suggestion.");
    } finally {
      setAiBusy(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    updateSettings({ goals: suggestion.goals });
    setNote(suggestion.note ?? null);
    setSuggestion(null);
  }

  return (
    <Card title="Daily targets" description="The goals each day is measured against — shown on the plate and the calendar dots.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {NUTRIENTS.map((n) => {
          const meta = NUTRIENT_META[n];
          return (
            <label key={n} className="flex flex-col gap-1 rounded-lg border border-line p-3" style={{ background: meta.soft }}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
              <span className="flex items-baseline gap-1">
                <input
                  value={settings.goals[n] || ""}
                  onChange={(e) => setGoal(n, Number(e.target.value) || 0)}
                  inputMode="decimal"
                  placeholder="0"
                  className="nums w-full bg-transparent text-lg font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <span className="text-xs text-ink-faint">{meta.unit === "kcal" ? "kcal" : "g"}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-6 rounded-organic border border-line bg-paper/50 p-4">
        <h3 className="font-display text-base text-ink">Or set them from your body profile</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Select label="Sex" value={profile.sex} onChange={(v) => setProfile({ sex: v as Profile["sex"] })} options={[["male", "Male"], ["female", "Female"]]} />
          <Num label="Age" value={profile.age} onChange={(v) => setProfile({ age: v })} />
          <Num label="Height (cm)" value={profile.heightCm} onChange={(v) => setProfile({ heightCm: v })} />
          <Num label="Weight (kg)" value={profile.weightKg} onChange={(v) => setProfile({ weightKg: v })} />
          <Select label="Activity" value={profile.activity} onChange={(v) => setProfile({ activity: v as Profile["activity"] })} options={ACTIVITY.map((a) => [a.id, a.label])} />
          <Select label="Goal" value={profile.goal} onChange={(v) => setProfile({ goal: v as Profile["goal"] })} options={[["lose", "Lose weight"], ["maintain", "Maintain"], ["gain", "Gain weight"]]} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={calcFromProfile} className="rounded-pill border border-herb bg-surface px-4 py-2 text-sm font-semibold text-herb transition hover:bg-herb-soft">
            Calculate targets
          </button>
          <button type="button" onClick={aiSuggest} disabled={aiBusy} className="rounded-pill bg-herb px-4 py-2 text-sm font-semibold text-paper transition hover:bg-herb-deep disabled:opacity-50">
            {aiBusy ? "Asking AI…" : "Suggest with AI"}
          </button>
        </div>
        {note && <p className="mt-3 rounded-lg bg-herb-soft px-3 py-2 text-sm text-herb-deep">{note}</p>}
        {error && <p className="mt-3 text-sm text-protein">{error}</p>}
      </div>

      {suggestion && (
        <SuggestionDialog
          current={settings.goals}
          suggestion={suggestion}
          onConfirm={applySuggestion}
          onCancel={() => setSuggestion(null)}
        />
      )}
    </Card>
  );
}

/** Confirmation dialog for AI-suggested daily targets. */
function SuggestionDialog({
  current,
  suggestion,
  onConfirm,
  onCancel,
}: {
  current: DailyGoals;
  suggestion: { goals: DailyGoals; note?: string };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI suggested targets"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-organic border border-line bg-surface p-6 shadow-[0_8px_30px_#2b272233]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl text-ink">AI suggested targets</h3>
        <p className="mt-1 text-sm text-ink-soft">Review these before they replace your current daily targets.</p>

        <div className="mt-4 space-y-2">
          {NUTRIENTS.map((n) => {
            const meta = NUTRIENT_META[n];
            const from = current[n];
            const to = suggestion.goals[n];
            const changed = from !== to;
            return (
              <div
                key={n}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
                style={{ background: meta.soft }}
              >
                <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                <span className="nums text-sm text-ink">
                  {changed && <span className="mr-1.5 text-ink-faint line-through">{from}</span>}
                  <span className="font-semibold">{to}</span>
                  <span className="ml-1 text-xs text-ink-faint">{meta.unit === "kcal" ? "kcal" : "g"}</span>
                </span>
              </div>
            );
          })}
        </div>

        {suggestion.note && (
          <p className="mt-4 rounded-lg bg-herb-soft px-3 py-2 text-sm text-herb-deep">{suggestion.note}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-ink-soft"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-pill bg-herb px-4 py-2 text-sm font-semibold text-paper transition hover:bg-herb-deep"
          >
            Apply targets
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- account ---------------------------------- */

function AccountSection() {
  const { user, configured } = useSession();
  const { settings, updateSettings } = useStore();
  const [name, setName] = useState(settings.name ?? "");

  function handleNameBlur() {
    const trimmed = name.trim();
    updateSettings({ name: trimmed || undefined });
  }

  return (
    <Card title="Sync & account" description="Your journal lives on this device. Sign in with Google to back it up and use it across devices.">
      <div className="mb-4">
        <Field label="Your name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="e.g. Arihant"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-ink-faint">Shown in the navbar as &ldquo;{name.trim() || "Arihant"}&rsquo;s Food Journal&rdquo;.</p>
        </Field>
      </div>
      {configured ? (
        user ? (
          <p className="rounded-lg bg-herb-soft px-4 py-3 text-sm text-herb-deep">
            Signed in as <strong>{user.email}</strong>. Your entries sync automatically. Use the account menu (top right) to sign out.
          </p>
        ) : (
          <p className="text-sm text-ink-soft">Use the <strong>Sign in</strong> button in the top-right corner to connect your Google account.</p>
        )
      ) : (
        <GoogleSetup />
      )}
    </Card>
  );
}

function GoogleSetup() {
  return (
    <div className="space-y-3 text-sm text-ink-soft">
      <p>Google sign-in isn&rsquo;t configured yet. It&rsquo;s optional — the app works fully offline without it. To enable cloud sync:</p>
      <ol className="ml-5 list-decimal space-y-1.5">
        <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-herb underline">Google Cloud Console → Credentials</a>.</li>
        <li>Create an <strong>OAuth 2.0 Client ID</strong> of type <em>Web application</em>.</li>
        <li>Under <strong>Authorized JavaScript origins</strong>, add your site URL (and <code>http://localhost:3000</code> for local dev).</li>
        <li>Copy the Client ID and add it to your <code>.env.local</code> as <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.</li>
        <li>For server-side verification &amp; MongoDB sync, also set <code>GOOGLE_CLIENT_ID</code> (same value) and ensure <code>MONGODB_URI</code> is set.</li>
        <li>Restart the dev server. A <strong>Sign in</strong> button will appear in the top-right.</li>
      </ol>
    </div>
  );
}

/* ------------------------------- export ----------------------------------- */

const QUICK_RANGES: { label: string; range: () => [string, string] }[] = [
  {
    label: "Today",
    range: () => {
      const d = new Date().toISOString().slice(0, 10);
      return [d, d];
    },
  },
  {
    label: "This week",
    range: () => {
      const now = new Date();
      const day = now.getDay(); // 0=Sun
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((day + 6) % 7));
      return [mon.toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
    },
  },
  {
    label: "This month",
    range: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return [first.toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
    },
  },
  {
    label: "This year",
    range: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), 0, 1);
      return [first.toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
    },
  },
  {
    label: "All time",
    range: () => ["1970-01-01", new Date().toISOString().slice(0, 10)],
  },
];

function ExportSection() {
  const { entries } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [error, setError] = useState<string | null>(null);

  function applyQuickRange(range: () => [string, string]) {
    const [f, t] = range();
    setFrom(f);
    setTo(t);
    setError(null);
  }

  function handleExport() {
    setError(null);
    if (from > to) {
      setError("Start date must be on or before end date.");
      return;
    }

    const rows = entries
      .filter((e) => e.date >= from && e.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    if (rows.length === 0) {
      setError("No entries found in that date range.");
      return;
    }

    const header = ["date", "time", "name", "amount", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "notes"];
    const escape = (v: string | number | undefined) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      header.join(","),
      ...rows.map((e) =>
        [e.date, e.time, e.name, e.amount, e.calories, e.protein, e.carbs, e.fat, e.fiber, e.notes ?? ""]
          .map(escape)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `food-journal-${from}${from !== to ? `_to_${to}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card title="Export" description="Download your food entries as a CSV file for the selected date range.">
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_RANGES.map((q) => {
          const [qf, qt] = q.range();
          const active = from === qf && to === qt;
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => applyQuickRange(q.range)}
              className={`rounded-pill px-3 py-1.5 text-xs font-medium transition ${active
                ? "bg-herb text-paper shadow-sm"
                : "border border-line bg-surface text-ink-soft hover:border-herb"
                }`}
            >
              {q.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-soft">From</span>
          <input
            type="date"
            value={from}
            max={today}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-soft">To</span>
          <input
            type="date"
            value={to}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-pill bg-herb px-4 py-2 text-sm font-semibold text-paper transition hover:bg-herb-deep"
        >
          Export CSV
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-protein">{error}</p>}
    </Card>
  );
}

/* ------------------------------- danger ----------------------------------- */

function DangerSection() {
  const { clearAllEntries } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await clearAllEntries();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Card title="Danger zone">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Delete all journal entries</p>
          <p className="mt-0.5 text-xs text-ink-soft">Permanently removes every food entry — local and cloud. This cannot be undone.</p>
        </div>
        {confirming ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-ink-soft disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-pill bg-protein px-4 py-2 text-sm font-semibold text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Yes, delete all"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-pill border border-protein/50 bg-surface px-4 py-2 text-sm font-medium text-protein transition hover:bg-protein/10"
          >
            Delete all data
          </button>
        )}
      </div>
    </Card>
  );
}

/* -------------------------------- inputs ---------------------------------- */

const inputClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-herb";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <input value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} inputMode="decimal" className={`nums ${inputClass}`} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
