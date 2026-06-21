"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";
import { FoodEntry, NUTRIENTS, Nutrient, NutritionEstimate } from "@/lib/types";
import { NUTRIENT_META, roundNutrient, sumNutrition } from "@/lib/nutrition";
import { addDays, formatLongDate, isToday, newId, nowTime, todayISO } from "@/lib/date";
import { estimateNutrition } from "@/lib/ai/client";
import { PlateLegend, PlateRing } from "./PlateRing";

export function Dashboard() {
  const { ready, entries, settings, upsertEntry, upsertMany, deleteEntry, sync, refresh } = useStore();
  const [date, setDate] = useState(todayISO());
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ entry: FoodEntry; estimate: NutritionEstimate }[] | null>(null);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === date).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.createdAt - b.createdAt)),
    [entries, date],
  );
  const totals = useMemo(() => sumNutrition(dayEntries), [dayEntries]);

  function addEntry(draft: { name: string; amount: string; time: string }) {
    const now = Date.now();
    upsertEntry({
      id: newId(),
      date,
      time: draft.time,
      name: draft.name.trim(),
      amount: draft.amount.trim() || "1 serving",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  function patch(entry: FoodEntry, changes: Partial<FoodEntry>) {
    upsertEntry({ ...entry, ...changes, updatedAt: Date.now() });
  }

  async function fillNutrition() {
    setError(null);
    const named = dayEntries.filter((e) => e.name.trim());
    if (named.length === 0) {
      setError("Add at least one food item with a name first.");
      return;
    }
    // Prefer rows that have no nutrition yet; if all are filled, refresh them all.
    const unfilled = named.filter((e) => e.calories === 0 && e.protein === 0 && e.carbs === 0);
    const targets = unfilled.length ? unfilled : named;

    setFilling(true);
    try {
      const estimates = await estimateNutrition(
        targets.map((e) => ({ name: e.name, amount: e.amount })),
        settings.ai,
      );
      // Don't apply yet — let the user review and confirm each item first.
      setReview(targets.map((e, i) => ({ entry: e, estimate: estimates[i] })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fill nutrition.");
    } finally {
      setFilling(false);
    }
  }

  function applyReview(acceptedIds: string[]) {
    if (!review) return;
    const accepted = new Set(acceptedIds);
    const now = Date.now();
    const updates = review
      .filter((r) => accepted.has(r.entry.id))
      .map((r) => {
        const nutrients = Object.fromEntries(NUTRIENTS.map((n) => [n, r.estimate[n]]));
        return { ...r.entry, ...nutrients, aiFilled: true, updatedAt: now } as FoodEntry;
      });
    if (updates.length) upsertMany(updates);
    setReview(null);
  }

  if (!ready) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <DateBar date={date} onChange={setDate} sync={sync} onRefresh={refresh} />

      <section className="grid gap-6 rounded-organic border border-line bg-surface p-5 shadow-[0_1px_3px_#2b272210] sm:p-6 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <PlateRing totals={totals} goals={settings.goals} />
          <div className="w-full sm:w-auto lg:hidden">
            <PlateLegend totals={totals} goals={settings.goals} />
          </div>
        </div>
        <div className="hidden lg:flex lg:flex-col lg:justify-center">
          <h2 className="mb-3 font-display text-lg text-ink">How today is filling up</h2>
          <PlateLegend totals={totals} goals={settings.goals} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink">
            {dayEntries.length === 0 ? "Nothing logged yet" : `${dayEntries.length} item${dayEntries.length > 1 ? "s" : ""}`}
          </h2>
          <button
            type="button"
            onClick={fillNutrition}
            disabled={filling || dayEntries.length === 0}
            className="inline-flex items-center gap-2 rounded-pill bg-herb pl-3 pr-4 py-2 text-sm font-semibold text-paper shadow-sm transition hover:bg-herb-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparkIcon spinning={filling} />
            {filling ? "Estimating…" : "Fill nutrition values automatically"}
          </button>
        </div>

        {error && (
          <p className="rounded-lg border border-protein/30 bg-protein-soft/60 px-4 py-2.5 text-sm text-protein">
            {error}{" "}
            {(error.includes("Settings") || error.includes("provider")) && (
              <Link href="/settings" className="font-semibold underline">
                Open Settings
              </Link>
            )}
          </p>
        )}

        <AddFoodForm onAdd={addEntry} />

        {dayEntries.length > 0 && (
          <ul className="space-y-2">
            {dayEntries.map((e) => (
              <EntryCard key={e.id} entry={e} onPatch={patch} onDelete={() => deleteEntry(e.id)} />
            ))}
          </ul>
        )}
      </section>

      {review && (
        <NutritionReviewDialog items={review} onApply={applyReview} onCancel={() => setReview(null)} />
      )}
    </div>
  );
}

function DateBar({ date, onChange, sync, onRefresh }: { date: string; onChange: (d: string) => void; sync: string; onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{formatLongDate(date)}</h1>
        {!isToday(date) && (
          <button onClick={() => onChange(todayISO())} className="mt-0.5 text-sm font-medium text-herb hover:underline">
            Jump to today
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <NavBtn label="Previous day" onClick={() => onChange(addDays(date, -1))}>‹</NavBtn>
        <label className="sr-only" htmlFor="date-input">Choose date</label>
        <input
          id="date-input"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => onChange(e.target.value || todayISO())}
          className="rounded-pill border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft focus:border-herb"
        />
        <NavBtn label="Next day" onClick={() => onChange(addDays(date, 1))} disabled={isToday(date)}>›</NavBtn>
        {sync !== "local" && (
          <NavBtn label="Refresh from cloud" onClick={onRefresh} disabled={sync === "syncing"}>
            <RefreshIcon spinning={sync === "syncing"} />
          </NavBtn>
        )}
      </div>
    </div>
  );
}

function NavBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-pill border border-line bg-surface text-lg text-ink-soft transition hover:border-herb hover:text-herb disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function AddFoodForm({ onAdd }: { onAdd: (d: { name: string; amount: string; time: string }) => void }) {
  const [time, setTime] = useState(nowTime());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, amount, time });
    setName("");
    setAmount("");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 rounded-organic border border-dashed border-line bg-paper/50 p-2.5">
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        aria-label="Time"
        className="nums rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink-soft focus:border-herb"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a food — e.g. rice/banana/eggs"
        aria-label="Food name"
        className="min-w-[12rem] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-herb"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 1 plate/100g"
        aria-label="Amount"
        className="w-40 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-herb"
      />
      <button type="submit" className="rounded-pill bg-clay px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-95">
        Add
      </button>
    </form>
  );
}

function EntryCard({ entry, onPatch, onDelete }: { entry: FoodEntry; onPatch: (e: FoodEntry, c: Partial<FoodEntry>) => void; onDelete: () => void }) {
  return (
    <li className="rounded-organic border border-line bg-surface p-3 shadow-[0_1px_2px_#2b272208]">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={entry.time}
          onChange={(e) => onPatch(entry, { time: e.target.value })}
          aria-label="Time"
          className="nums rounded-lg border border-transparent bg-paper-deep/60 px-2 py-1.5 text-xs text-ink-soft focus:border-herb"
        />
        <input
          value={entry.name}
          onChange={(e) => onPatch(entry, { name: e.target.value })}
          aria-label="Food name"
          className="min-w-[10rem] flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1.5 font-medium text-ink hover:bg-paper-deep/40 focus:border-herb focus:bg-surface"
        />
        <input
          value={entry.amount}
          onChange={(e) => onPatch(entry, { amount: e.target.value })}
          placeholder="1 plate"
          aria-label="Amount"
          className="w-28 rounded-lg border border-transparent bg-paper-deep/60 px-2 py-1.5 text-sm text-ink-soft placeholder:text-ink-faint focus:border-herb"
        />
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${entry.name || "entry"}`}
          className="ml-auto grid h-8 w-8 place-items-center rounded-pill text-ink-faint transition hover:bg-protein-soft hover:text-protein"
        >
          ✕
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {NUTRIENTS.map((n) => (
          <NutrientField key={n} nutrient={n} value={entry[n]} onChange={(v) => onPatch(entry, { [n]: v })} />
        ))}
      </div>
    </li>
  );
}

function NutrientField({ nutrient, value, onChange }: { nutrient: Nutrient; value: number; onChange: (v: number) => void }) {
  const meta = NUTRIENT_META[nutrient];
  return (
    <label className="flex flex-col gap-0.5 rounded-lg px-1.5 py-1" style={{ background: meta.soft }}>
      <span className="flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
        {meta.short}
      </span>
      <input
        value={value ? roundNutrient(nutrient, value) : ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        inputMode="decimal"
        placeholder="0"
        aria-label={`${meta.label} in ${meta.unit}`}
        className="nums w-full bg-transparent text-sm font-medium text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </label>
  );
}

/** Per-item confirmation dialog for AI nutrition estimates. Mirrors the
 *  Settings "AI suggested targets" dialog. Nothing is applied until confirmed. */
function NutritionReviewDialog({
  items,
  onApply,
  onCancel,
}: {
  items: { entry: FoodEntry; estimate: NutritionEstimate }[];
  onApply: (acceptedIds: string[]) => void;
  onCancel: () => void;
}) {
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set(items.map((i) => i.entry.id)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function toggle(id: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const count = accepted.size;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review AI nutrition estimates"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-organic border border-line bg-surface shadow-[0_8px_30px_#2b272233]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h3 className="font-display text-xl text-ink">Review AI estimates</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Nothing is saved yet. Untick any item you don&rsquo;t want, then apply the rest.
          </p>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-6">
          {items.map(({ entry, estimate }) => {
            const on = accepted.has(entry.id);
            return (
              <div
                key={entry.id}
                className={`rounded-organic border p-3 transition ${on ? "border-line bg-paper/50" : "border-dashed border-line opacity-55"}`}
              >
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={on} onChange={() => toggle(entry.id)} className="h-4 w-4 accent-herb" />
                  <span className="font-medium text-ink">{entry.name.trim() || "Untitled"}</span>
                  {entry.amount.trim() && <span className="text-sm text-ink-faint">{entry.amount}</span>}
                </label>
                <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                  {NUTRIENTS.map((n) => {
                    const meta = NUTRIENT_META[n];
                    const from = roundNutrient(n, entry[n]);
                    const to = roundNutrient(n, estimate[n]);
                    const changed = from !== to;
                    return (
                      <div key={n} className="flex flex-col gap-0.5 rounded-lg px-1.5 py-1" style={{ background: meta.soft }}>
                        <span className="text-[0.6rem] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                          {meta.short}
                        </span>
                        <span className="nums text-sm font-medium text-ink">
                          {changed && <span className="mr-1 text-ink-faint line-through">{from}</span>}
                          {to}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-ink-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply([...accepted])}
            disabled={count === 0}
            className="rounded-pill bg-herb px-4 py-2 text-sm font-semibold text-paper transition hover:bg-herb-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply {count} item{count === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={spinning ? "animate-spin" : ""}>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SparkIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={spinning ? "animate-pulse" : ""}>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-paper-deep" />
      <div className="h-48 animate-pulse rounded-organic bg-paper-deep" />
      <div className="h-14 animate-pulse rounded-organic bg-paper-deep" />
    </div>
  );
}
