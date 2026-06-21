"use client";

import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useStore } from "@/components/providers/StoreProvider";
import { NUTRIENTS, Nutrient } from "@/lib/types";
import { NUTRIENT_HEX, NUTRIENT_META, roundNutrient } from "@/lib/nutrition";
import { averageOver, dailyTotals, recentDates } from "@/lib/analysis";
import { fromISODate } from "@/lib/date";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { HarvestCalendar } from "./HarvestCalendar";

const MACROS: Nutrient[] = ["protein", "carbs", "fat", "fiber"];

export function AnalysisView() {
  const { ready, entries, settings } = useStore();
  const totals = useMemo(() => dailyTotals(entries), [entries]);
  const now = new Date();
  const [cal, setCal] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const week = useMemo(() => recentDates(7), []);
  const { avg, daysLogged } = useMemo(() => averageOver(week, totals), [week, totals]);

  const metCounts = useMemo(() => {
    const counts = Object.fromEntries(NUTRIENTS.map((n) => [n, 0])) as Record<Nutrient, number>;
    for (const d of week) {
      const t = totals.get(d);
      if (!t) continue;
      for (const n of NUTRIENTS) if (settings.goals[n] > 0 && t[n] >= settings.goals[n]) counts[n]++;
    }
    return counts;
  }, [week, totals, settings.goals]);

  const calorieData = useMemo(
    () => recentDates(14).map((d) => ({ d, label: shortLabel(d), calories: Math.round(totals.get(d)?.calories ?? 0) })),
    [totals],
  );
  const macroData = useMemo(
    () =>
      recentDates(7).map((d) => {
        const t = totals.get(d);
        return { label: shortLabel(d), ...Object.fromEntries(MACROS.map((n) => [n, Math.round(t?.[n] ?? 0)])) } as { label: string } & Record<Nutrient, number>;
      }),
    [totals],
  );

  function shiftMonth(delta: number) {
    setCal((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  if (!ready) return <div className="h-96 animate-pulse rounded-organic bg-paper-deep" />;

  const hasData = entries.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Analysis</h1>
        <p className="mt-1 text-ink-soft">
          {hasData ? "Your nutrition over time, and which goals you met each day." : "Log a few meals on the Journal page and your trends will grow here."}
        </p>
      </header>

      {/* This week stat cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {NUTRIENTS.map((n) => {
          const meta = NUTRIENT_META[n];
          return (
            <div key={n} className="rounded-organic border border-line bg-surface p-4 shadow-[0_1px_3px_#2b272210]">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                {meta.label}
              </div>
              <div className="nums mt-2 font-display text-2xl font-semibold text-ink">
                <AnimatedNumber value={avg[n]} format={(v) => roundNutrient(n, v)} />
                {settings.goals[n] > 0 && (
                  <span className="text-lg font-normal text-ink-faint">/{roundNutrient(n, settings.goals[n])}</span>
                )}
                <span className="ml-1 text-sm font-normal text-ink-faint">{meta.unit === "kcal" ? "kcal" : "g"}</span>
              </div>
              <div className="mt-1 text-xs text-ink-soft">
                avg/day · met <AnimatedNumber value={metCounts[n]} />/{daysLogged || 0}d
              </div>
            </div>
          );
        })}
      </section>

      {/* Calories chart */}
      <ChartCard title="Calories — last 14 days" subtitle={`Goal ${settings.goals.calories} kcal`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={calorieData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }} tickLine={false} axisLine={false} width={52} domain={[0, (dataMax: number) => Math.max(dataMax, settings.goals.calories)]} />
            <Tooltip cursor={{ fill: "var(--color-line-soft)" }} contentStyle={tooltipStyle} />
            <ReferenceLine y={settings.goals.calories} stroke={NUTRIENT_HEX.calories} strokeDasharray="4 4" />
            <Bar dataKey="calories" radius={[5, 5, 0, 0]} maxBarSize={28}>
              {calorieData.map((row) => (
                <Cell key={row.d} fill={row.calories >= settings.goals.calories ? NUTRIENT_HEX.calories : "var(--color-cal-soft)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Macro charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MACROS.map((n) => {
          const meta = NUTRIENT_META[n];
          const goal = settings.goals[n] ?? 0;
          return (
            <ChartCard key={n} title={`${meta.label} — last 7 days`} subtitle={goal > 0 ? `Goal ${goal} g` : undefined}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={macroData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-faint)" }} tickLine={false} axisLine={false} width={40} domain={[0, (dataMax: number) => Math.max(dataMax, goal)]} />
                  <Tooltip cursor={{ fill: "var(--color-line-soft)" }} contentStyle={tooltipStyle} />
                  {goal > 0 && <ReferenceLine y={goal} stroke={NUTRIENT_HEX[n]} strokeDasharray="4 4" />}
                  <Bar dataKey={n} name={meta.label} radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {macroData.map((row) => (
                      <Cell key={row.label} fill={(row[n] as number) >= goal && goal > 0 ? NUTRIENT_HEX[n] : `${NUTRIENT_HEX[n]}80`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          );
        })}
      </div>

      <HarvestCalendar
        year={cal.year}
        month={cal.month}
        totals={totals}
        goals={settings.goals}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-organic border border-line bg-surface p-5 shadow-[0_1px_3px_#2b272210] sm:p-6">
      <div className="mb-4">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  fontSize: 13,
  boxShadow: "0 8px 30px #2b272214",
} as const;

function shortLabel(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
