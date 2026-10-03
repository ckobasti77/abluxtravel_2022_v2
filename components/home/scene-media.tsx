"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroScene } from "../../lib/home/hero-manifest";
import { cn } from "../ui/cn";
import { useMotionPreferences } from "./use-motion-preferences";

type SceneMediaProps = {
  scene: HeroScene;
  /** Which poster to prefer: wide (desktop) or tall (mobile) composition. */
  shape?: "wide" | "tall";
  alt?: string;
  className?: string;
};

/**
 * A manifest scene outside the hero (Ostrog spotlight, Rent a bus): the poster
 * with a slow CSS zoom, plus the clip when motion and data allow (desktop only).
 * A "drone" clip plays once when it scrolls into view and rests on its last
 * frame; a "loop" clip loops while visible; "still" stays a poster.
 */
export function SceneMedia({ scene, shape = "wide", alt = "", className }: SceneMediaProps) {
  const prefs = useMotionPreferences();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const variant = shape === "tall" ? scene.mobile : scene.desktop;
  const poster = variant.poster ?? scene.desktop.poster ?? scene.mobile.poster;
  const videoOk = prefs.ready && !prefs.reducedMotion && !prefs.lowData && !prefs.phone && Boolean(variant.mp4 || variant.webm);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.4), {
      threshold: [0, 0.4],
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [videoOk]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) {
      if (!video.ended) video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [inView]);

  if (!poster) return null;

  return (
    <div className={cn("ablux-scene-media", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-encoded AVIF poster */}
      <img
        className={cn("ablux-scene-media__poster", !playing && "ablux-scene-media__poster--zoom")}
        src={poster}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={shape === "tall" ? 1080 : 1920}
        height={shape === "tall" ? 1920 : 1080}
      />
      {videoOk ? (
        <video
          ref={videoRef}
          className={cn("ablux-scene-media__video", playing && "is-playing")}
          muted
          playsInline
          loop={scene.motion === "loop"}
          preload={inView ? "auto" : "none"}
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
        >
          {variant.webm ? <source src={variant.webm} type="video/webm" /> : null}
          {variant.mp4 ? <source src={variant.mp4} type="video/mp4" /> : null}
        </video>
      ) : null}
    </div>
  );
}
