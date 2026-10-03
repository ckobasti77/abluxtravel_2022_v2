"use client";

import { useEffect, useRef } from "react";
import { useMotionPreferences } from "../../home/use-motion-preferences";

/**
 * Admin hero clip of a travel group: plays muted in a loop only when motion
 * and data allow; otherwise it rests on its first frame (no poster exists).
 */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const prefs = useMotionPreferences();
  const ref = useRef<HTMLVideoElement>(null);
  const play = prefs.ready && !prefs.reducedMotion && !prefs.lowData;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (play) video.play().catch(() => undefined);
    else video.pause();
  }, [play]);

  return (
    <video
      ref={ref}
      src={`${src}#t=0.1`}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
