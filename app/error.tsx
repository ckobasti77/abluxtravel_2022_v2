"use client";

import { useEffect } from "react";
import { LostTicket } from "../components/chrome/lost-ticket";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Visible in the browser console and in Vercel logs; no user data is attached.
    console.error(error);
  }, [error]);

  return <LostTicket kind="error" onRetry={reset} />;
}
