// Days / nights parsing (pure): "7 dana / 5 noćenja", "3 noćenja / 6 dana",
// "8 dana | 3 noći", "7 dana (6 noćenja)", "10 noći", "10 ili 7 noćenja".
import { fold } from "../text";

export type Duration = { days?: number; nights?: number; nightsMax?: number };

export function parseDuration(text: string | undefined): Duration {
  if (!text) return {};
  const folded = fold(text);
  const result: Duration = {};
  const days = folded.match(/(\d{1,2})\s*(?:dana|dan)\b/);
  if (days) result.days = Number(days[1]);
  const options = folded.match(/(\d{1,2})\s*(?:ili|\/)\s*(\d{1,2})\s*(?:nocenja|nocenje|noci|noc)\b/);
  if (options) {
    const a = Number(options[1]);
    const b = Number(options[2]);
    result.nights = Math.min(a, b);
    result.nightsMax = Math.max(a, b);
    return result;
  }
  const nights = folded.match(/(\d{1,2})\s*(?:nocenja|nocenje|nocenj|noci|noc)\b/);
  if (nights) result.nights = Number(nights[1]);
  return result;
}
