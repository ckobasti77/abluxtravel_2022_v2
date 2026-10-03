"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, Pause, Play, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type AnimationEvent } from "react";
import { HERO_CHANNELS, type HeroChannelKey, type HeroScene, type HeroScenes } from "../../lib/home/hero-manifest";
import { offerCountLabel } from "../../lib/search/trip-search";
import { TripSearch } from "../search/trip-search";
import { useSitePreferences } from "../site-preferences-provider";
import { cn } from "../ui/cn";
import { useHeroScene } from "./scene-store";
import { useMotionPreferences } from "./use-motion-preferences";

gsap.registerPlugin(useGSAP);

/** Auto-advance every 9 s; after the visitor picks a channel, move on after 12 s of rest. */
const AUTO_MS = 9000;
const IDLE_MS = 12000;
/** Crossfade between two scene layers. */
const FADE_MS = 700;
/** The next clip starts downloading this long before the switch. */
const PRELOAD_LEAD_MS = 2000;

const CHANNEL_TONE: Record<HeroChannelKey, "brick" | "teal" | "teal-deep"> = {
  hodocasca: "brick",
  mediteran: "teal",
  evropa: "teal-deep",
};

const CHANNEL_TYPE: Record<HeroChannelKey, string> = {
  hodocasca: "verski-turizam",
  mediteran: "letovanje",
  evropa: "evropski-gradovi",
};

type HomeHeroProps = {
  scenes: HeroScenes;
  /** Live public offer count per travel type (ticket stamps). */
  typeCounts: Record<string, number>;
};

/**
 * Hero "Živa razglednica": three scenes (hodočašća, mediteran, evropa) from
 * public/media/hero/manifest.json. The tickets are channels; the active
 * ticket's perforation tears as the 9 s timer. Posters render on the server;
 * video, auto-advance and the scroll morph start only when motion and data allow.
 */
export default function HomeHero({ scenes, typeCounts }: HomeHeroProps) {
  const { dictionary, language } = useSitePreferences();
  const copy = dictionary.homepage;
  const prefs = useMotionPreferences();
  const active = useHeroScene((state) => state.active);
  const setActive = useHeroScene((state) => state.setActive);
  const rootRef = useRef<HTMLElement>(null);

  const [previous, setPrevious] = useState<HeroChannelKey | null>(null);
  const [cycle, setCycle] = useState(0);
  const [pickedByUser, setPickedByUser] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [postersArmed, setPostersArmed] = useState(false);
  const [preloadKey, setPreloadKey] = useState<HeroChannelKey | null>(null);

  const motionOk = prefs.ready && !prefs.reducedMotion;
  const videoOk = motionOk && !prefs.lowData;
  const autoCapable = motionOk && !prefs.lowData;
  const autoOn = autoCapable && !userPaused;
  const running = autoOn && !hovered && !focused && !tabHidden && !offscreen;
  const duration = pickedByUser ? IDLE_MS : AUTO_MS;
  const activeIndex = HERO_CHANNELS.indexOf(active);
  const nextKey = HERO_CHANNELS[(activeIndex + 1) % HERO_CHANNELS.length];

  const switchTo = useCallback(
    (key: HeroChannelKey, byUser: boolean) => {
      setPostersArmed(true);
      setPickedByUser(byUser);
      setCycle((value) => value + 1);
      setPreloadKey(null);
      if (key !== active) {
        setPrevious(active);
        setActive(key);
      }
    },
    [active, setActive],
  );

  // The outgoing layer stays under the incoming one until the crossfade ends.
  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => setPrevious(null), FADE_MS + 50);
    return () => window.clearTimeout(timer);
  }, [previous, cycle]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Pause (timer and video) while the hero is off screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting || entry.intersectionRatio < 0.2), {
      threshold: [0, 0.2, 0.5],
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // The other posters load once the page is idle (never on Save-Data).
  useEffect(() => {
    if (!prefs.ready || prefs.lowData) return;
    const timer = window.setTimeout(() => setPostersArmed(true), 2500);
    return () => window.clearTimeout(timer);
  }, [prefs.ready, prefs.lowData]);

  // Start downloading the next clip PRELOAD_LEAD_MS before the switch.
  useEffect(() => {
    if (!running) return;
    let elapsed = 0;
    const step = 250;
    const timer = window.setInterval(() => {
      elapsed += step;
      if (elapsed >= duration - PRELOAD_LEAD_MS) {
        setPreloadKey(nextKey);
        setPostersArmed(true);
        window.clearInterval(timer);
      }
    }, step);
    return () => window.clearInterval(timer);
  }, [running, duration, nextKey, cycle]);

  const onTearEnd = (event: AnimationEvent<HTMLSpanElement>) => {
    if (event.animationName !== "ablux-ticket-tear") return;
    switchTo(nextKey, false);
  };

  // Load sequence: the stamp presses in, headline lines rise. Content is visible without JS.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".ablux-hero__stamp", { scale: 1.6, rotate: -14, autoAlpha: 0, duration: 0.55 }, 0.1)
          .from(".ablux-hero__kicker-text", { autoAlpha: 0, x: -12, duration: 0.6 }, 0.35)
          .from(".ablux-hero__line", { yPercent: 40, autoAlpha: 0, duration: 0.78, stagger: 0.09 }, 0.3)
          .from(".ablux-hero__lead, .ablux-hero__actions", { y: 22, autoAlpha: 0, duration: 0.72, stagger: 0.08 }, 0.55)
          .from(".ablux-route-ticket", { y: 24, autoAlpha: 0, duration: 0.72, stagger: 0.06 }, 0.7)
          .from(".ablux-booking", { y: 16, autoAlpha: 0, duration: 0.72 }, 0.88);
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const channel = copy.channels[active];

  return (
    <section ref={rootRef} className="ablux-hero" data-scene={active} aria-labelledby="home-hero-title">
      <div className="ablux-hero__scene" data-hero-scene aria-hidden="true">
        <div className="ablux-hero__frame">
          {HERO_CHANNELS.map((key, index) => (
            <SceneLayer
              key={key}
              scene={scenes[key]}
              isDefault={index === 0}
              isActive={key === active}
              isPrevious={key === previous}
              showPoster={index === 0 || postersArmed || key === active || key === previous}
              videoOk={videoOk && (!prefs.phone || index === 0)}
              phone={prefs.phone}
              preload={key === active || key === preloadKey}
              suspended={offscreen || tabHidden}
              playToken={key === active ? cycle : -1}
            />
          ))}
          {motionOk && cycle > 0 ? <span key={cycle} className="ablux-hero__grain" /> : null}
        </div>
        <span className="ablux-hero__deckle" />
        <span className="ablux-hero__postmark">
          <span className="ui-postcard__stamp">
            <span className="ui-postcard__stamp-inner">
              <TicketGlyph variant={active} />
            </span>
          </span>
        </span>
      </div>
      <div className="ablux-hero__shade" aria-hidden="true">
        <MapLines />
      </div>
      <div className="ablux-hero__paper-band" aria-hidden="true" />

      <div className="ablux-hero__inner">
        <div className="ablux-hero__copy">
          <p className="ablux-hero__kicker">
            <span className="ablux-hero__stamp">
              <b>AB</b>
              <span>{copy.heroStampSince}</span>
            </span>
            <span className="ablux-hero__kicker-text">
              <span className="ablux-hero__kicker-line" aria-hidden="true" />
              {copy.heroKicker}
            </span>
          </p>
          <h1 id="home-hero-title">
            <span className="ablux-hero__line">{copy.heroLine1}</span>{" "}
            <span className="ablux-hero__line">
              {copy.heroLine2} <em>{copy.heroEmphasis}</em>
            </span>
          </h1>
          <p className="ablux-hero__lead">{copy.heroLead}</p>
          <div className="ablux-hero__actions">
            <Link href="/ponude" className="ablux-btn ablux-btn--gold">
              {copy.ctaOffers}
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
            <Link href="/kontakt" className="ablux-btn ablux-btn--ghost">
              {copy.ctaInquiry}
              <Send aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </div>
        </div>

        <div className="ablux-hero__dock">
          <div className="ablux-hero__caption">
            <Link href={channel.href} className="ablux-hero__caption-link" prefetch={false}>
              {channel.linkLabel}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} />
            </Link>
            {autoCapable ? (
              <button
                type="button"
                className="ablux-hero__pause"
                aria-pressed={userPaused}
                aria-label={userPaused ? copy.playScenes : copy.pauseScenes}
                title={userPaused ? copy.playScenes : copy.pauseScenes}
                onClick={() => setUserPaused((value) => !value)}
              >
                {userPaused ? <Play aria-hidden="true" strokeWidth={1.75} /> : <Pause aria-hidden="true" strokeWidth={1.75} />}
              </button>
            ) : null}
          </div>

          <div
            className="ablux-hero__route-ribbon ui-paper"
            role="group"
            aria-label={copy.channelsLabel}
            onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
            }}
          >
            {HERO_CHANNELS.map((key) => {
              const ticket = copy.channels[key];
              const count = typeCounts[CHANNEL_TYPE[key]] ?? 0;
              const isActive = key === active;
              return (
                <button
                  key={key}
                  type="button"
                  className={cn("ablux-route-ticket", `ablux-route-ticket--${CHANNEL_TONE[key]}`, isActive && "is-active")}
                  aria-pressed={isActive}
                  onClick={() => switchTo(key, true)}
                  onPointerEnter={() => setPostersArmed(true)}
                >
                  <span className="ablux-route-ticket__icon" aria-hidden="true">
                    <TicketGlyph variant={key} />
                  </span>
                  <span className="ablux-route-ticket__body">
                    <span className="ablux-route-ticket__index" aria-hidden="true">
                      {ticket.index}
                    </span>
                    <strong>{ticket.title}</strong>
                    <span className="ablux-route-ticket__meta">{ticket.meta}</span>
                    {count > 0 ? <span className="sr-only">{`, ${offerCountLabel(count, language)}`}</span> : null}
                  </span>
                  <span className="ablux-route-ticket__stamp" aria-hidden="true">
                    <small>{copy.stampRoute}</small>
                    <strong>{ticket.code}</strong>
                    {count > 0 ? <em>{offerCountLabel(count, language)}</em> : null}
                  </span>
                  <span className="ablux-route-ticket__perf" aria-hidden="true">
                    {isActive && autoOn ? (
                      <span
                        key={`${key}-${cycle}`}
                        className="ablux-route-ticket__tear"
                        style={{
                          animationDuration: `${duration}ms`,
                          animationPlayState: running ? "running" : "paused",
                        }}
                        onAnimationEnd={onTearEnd}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <TripSearch variant="bar" className="ablux-booking" />
      </div>
    </section>
  );
}

type SceneLayerProps = {
  scene: HeroScene;
  isDefault: boolean;
  isActive: boolean;
  isPrevious: boolean;
  showPoster: boolean;
  videoOk: boolean;
  phone: boolean;
  preload: boolean;
  suspended: boolean;
  /** Changes every time this layer is (re)selected; drone clips restart from the first frame. */
  playToken: number;
};

function SceneLayer({
  scene,
  isDefault,
  isActive,
  isPrevious,
  showPoster,
  videoOk,
  phone,
  preload,
  suspended,
  playToken,
}: SceneLayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const variant = phone ? scene.mobile : scene.desktop;
  const hasVideo = videoOk && Boolean(variant.mp4 || variant.webm);
  const drone = scene.motion === "drone";

  // A drone clip plays once from the start each time its channel is chosen.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive || !drone || playToken < 0) return;
    try {
      video.currentTime = 0;
    } catch {
      // Not seekable yet; it starts at 0 anyway.
    }
  }, [isActive, drone, playToken]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive && !suspended) {
      if (!(drone && video.ended)) video.play().catch(() => undefined);
      return;
    }
    if (isActive) {
      video.pause();
      return;
    }
    const timer = window.setTimeout(() => video.pause(), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [isActive, suspended, drone, playToken, hasVideo]);

  return (
    <div className={cn("ablux-hero__layer", isActive && "is-active", isPrevious && "is-previous")} data-scene-layer={scene.key}>
      {showPoster && (scene.desktop.poster || scene.mobile.poster) ? (
        <picture>
          {scene.mobile.poster ? <source media="(max-width: 767px)" srcSet={scene.mobile.poster} /> : null}
          <img
            className={cn("ablux-hero__poster", !(hasVideo && playing) && "ablux-hero__poster--zoom")}
            src={(scene.desktop.poster ?? scene.mobile.poster) as string}
            alt=""
            width={1920}
            height={1080}
            loading={isDefault ? "eager" : "lazy"}
            fetchPriority={isDefault ? "high" : "low"}
            decoding="async"
          />
        </picture>
      ) : null}
      {hasVideo ? (
        <video
          key={phone ? "mobile" : "desktop"}
          ref={videoRef}
          className={cn("ablux-hero__video", playing && "is-playing")}
          muted
          playsInline
          loop={scene.motion === "loop"}
          preload={preload ? "auto" : "none"}
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => setPlaying(true)}
        >
          {variant.webm ? <source src={variant.webm} type="video/webm" /> : null}
          {variant.mp4 ? <source src={variant.mp4} type="video/mp4" /> : null}
        </video>
      ) : null}
    </div>
  );
}

/** Engraved map contour lines over the title zone (static, 10% opacity). */
function MapLines() {
  return (
    <svg className="ablux-hero__map" viewBox="0 0 600 400" preserveAspectRatio="xMinYMid slice" focusable="false">
      <path d="M-10 60 C 80 30, 160 90, 250 60 S 420 20, 520 70" />
      <path d="M-10 110 C 70 80, 170 140, 260 108 S 410 70, 540 118" />
      <path d="M-10 170 C 90 140, 150 200, 240 172 S 400 130, 560 182" />
      <path d="M-10 236 C 60 206, 180 262, 270 232 S 430 196, 580 246" />
      <path d="M-10 300 C 100 270, 160 330, 250 300 S 420 262, 600 312" />
      <path d="M40 360 C 120 330, 210 380, 300 352" />
      <circle cx="182" cy="140" r="34" />
      <circle cx="182" cy="140" r="58" />
      <circle cx="420" cy="260" r="22" />
    </svg>
  );
}

function TicketGlyph({ variant }: { variant: HeroChannelKey }) {
  if (variant === "mediteran") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M30 49c3-8 4-17 3-26" />
        <path d="M34 23c5-8 13-10 19-5-8 1-13 4-19 5Z" />
        <path d="M33 23c-8-4-15-3-20 3 8-1 14 0 20-3Z" />
        <path d="M32 23c1-8 6-13 14-13-5 5-8 9-14 13Z" />
        <path d="M16 50c6-3 25-3 32 0" />
        <path d="M20 56c5-2 19-2 24 0" />
      </svg>
    );
  }

  if (variant === "evropa") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M15 49V31l9-7 9 7v18" />
        <path d="M25 49V36h8v13" />
        <path d="M40 49V24l7-7 7 7v25" />
        <path d="M47 17V9" />
        <path d="M43 13h8" />
        <path d="M11 49h46" />
        <path d="M19 33h10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M12 50h40" />
      <path d="M17 50V31l15-10 15 10v19" />
      <path d="M24 50V37h16v13" />
      <path d="M32 21v-9" />
      <path d="M27 15h10" />
      <path d="M20 31h24" />
      <path d="M15 50V39h-4v11" />
      <path d="M53 50V39h-4v11" />
    </svg>
  );
}
