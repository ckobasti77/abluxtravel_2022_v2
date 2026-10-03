// Board (meal plan) parsing (pure).
import type { Board } from "../types";
import { fold } from "../text";

export function parseBoard(text: string | undefined): Board | undefined {
  if (!text) return undefined;
  const folded = fold(text);
  if (/ultra\s*all\s*inclusive/.test(folded) || /\bUAI\b/.test(text)) return "uai";
  if (/all\s*inclusive/.test(folded) || /\bAI\b/.test(text)) return "ai";
  if (/polupansion|half\s*board/.test(folded) || /\b(PP|HB)\b/.test(text)) return "hb";
  if (/pun\s*pansion|full\s*board/.test(folded) || /\b(PA|FB)\b/.test(text)) return "fb";
  if (/nocenje\s*(sa|i)\s*dorucko|dorucak|dorucko|bed\s*(&|and)\s*breakfast/.test(folded) || /\b(ND|BB)\b/.test(text)) {
    return "bb";
  }
  if (/samo\s*smestaj|bez\s*ishrane|najam|room\s*only/.test(folded) || /\b(RO|NA)\b/.test(text)) return "ro";
  return undefined;
}
