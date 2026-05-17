const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(ts: string | null, now: number = Date.now()): string {
  if (!ts) return "never";
  const parsed = Date.parse(`${ts} UTC`);
  if (Number.isNaN(parsed)) return "never";
  const diff = Math.max(0, now - parsed);
  if (diff < MINUTE) return `${Math.floor(diff / SECOND).toString()}s ago`;
  if (diff < HOUR) return `${Math.floor(diff / MINUTE).toString()}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR).toString()}h ago`;
  return `${Math.floor(diff / DAY).toString()}d ago`;
}
