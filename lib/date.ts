/** Local-time date helpers. All ISO dates are "YYYY-MM-DD" in local time. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = (): string => toISODate(new Date());

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, delta: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatLongDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

/** A unique id; crypto.randomUUID is available in modern browsers and Node. */
export const newId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
