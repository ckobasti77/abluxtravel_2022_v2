// Transport parsing (pure).
import type { Transport } from "../types";
import { fold } from "../text";

export function parseTransports(text: string | undefined): Transport[] {
  if (!text) return [];
  const folded = fold(text);
  const found = new Set<Transport>();
  if (/autobus|\bbus\b|autobusk|la-bus|vanlinijsk/.test(folded)) found.add("bus");
  if (/avion|\bavio\b|\bflight\b|la-plane|\blet\b|letom/.test(folded)) found.add("plane");
  if (/sopstven\w* prevoz/.test(folded)) found.add("self");
  if (/krstarenj|\bbrodom\b|la-ship|\bcruise\b/.test(folded)) found.add("ship");
  if (/\bvozom\b|\bvoz\b/.test(folded)) found.add("train");
  return [...found];
}
