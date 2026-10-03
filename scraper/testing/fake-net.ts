// Fake fetch + clock for PartnerHttpClient tests (no network, no real waits).
import { PartnerHttpClient } from "../core/http";
import type { PartnerConfig } from "../core/types";

export type Reply = { status?: number; body?: string; headers?: Record<string, string>; chunkSize?: number } | Error;

/** Body as a stream of `size`-byte chunks, like a real network response. */
function chunked(body: string, size: number): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(body);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset + size));
      offset += size;
    },
  });
}

/** Replies keyed by URL substring; a queue with more than one reply is consumed in order, the last one repeats. */
export function fakeNet(replies: Record<string, Reply[]>) {
  let clock = 1_000_000;
  const calls: { url: string; at: number; ua?: string }[] = [];
  const fetchImpl = (async (input: string, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, at: clock, ua: (init?.headers as Record<string, string>)?.["User-Agent"] });
    const key = Object.keys(replies).find((pattern) => url.includes(pattern));
    const queue = key ? replies[key] : undefined;
    const reply = queue && queue.length > 1 ? queue.shift()! : queue?.[0];
    if (!reply) return new Response("not found", { status: 404 });
    if (reply instanceof Error) throw reply;
    const body = reply.chunkSize ? chunked(reply.body ?? "", reply.chunkSize) : (reply.body ?? "");
    return new Response(body, { status: reply.status ?? 200, headers: reply.headers ?? { "content-type": "text/html" } });
  }) as unknown as typeof fetch;
  return {
    calls,
    fetchImpl,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
  };
}

export const ROBOTS_OK: Reply = { body: "User-agent: *\nDisallow:\n", headers: { "content-type": "text/plain" } };

export function fakeClient(config: PartnerConfig, net: ReturnType<typeof fakeNet>, max = 50) {
  return new PartnerHttpClient({ config, budget: { max, used: 0 }, fetchImpl: net.fetchImpl, now: net.now, sleep: net.sleep, retryDelaysMs: [5000, 15000] });
}
