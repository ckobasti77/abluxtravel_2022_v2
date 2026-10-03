"use client";

import { useEffect, useState } from "react";

type NetworkInformation = EventTarget & { saveData?: boolean; effectiveType?: string };

export type MotionPreferences = {
  /** False on the server and before the first effect: render posters only. */
  ready: boolean;
  reducedMotion: boolean;
  /** Save-Data or a 2g/3g connection: posters only, no video. */
  lowData: boolean;
  /** Phone layout (9:16 posters; only the default scene plays video). */
  phone: boolean;
};

const PHONE_QUERY = "(max-width: 767px)";

function read(): MotionPreferences {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  const effectiveType = connection?.effectiveType ?? "";
  return {
    ready: true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    lowData: Boolean(connection?.saveData) || effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g",
    phone: window.matchMedia(PHONE_QUERY).matches,
  };
}

/** Motion, data and layout preferences for the hero (DESIGN.md → Motion). */
export function useMotionPreferences(): MotionPreferences {
  const [prefs, setPrefs] = useState<MotionPreferences>({ ready: false, reducedMotion: false, lowData: false, phone: false });

  useEffect(() => {
    const update = () => setPrefs(read());
    update();
    const queries = [window.matchMedia("(prefers-reduced-motion: reduce)"), window.matchMedia(PHONE_QUERY)];
    queries.forEach((query) => query.addEventListener("change", update));
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    connection?.addEventListener?.("change", update);
    return () => {
      queries.forEach((query) => query.removeEventListener("change", update));
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  return prefs;
}
