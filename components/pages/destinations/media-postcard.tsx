import { BRAND_GLYPHS, CancelLines, type BrandGlyphName } from "../../ui/brand-glyphs";
import { cn } from "../../ui/cn";

type MediaPostcardProps = {
  /** Photo (partner, Convex storage or approved art); http:// is never shown. */
  image?: string | null;
  /** Admin video (travel groups): shown as a still first frame, never autoplayed here. */
  video?: string | null;
  alt: string;
  placeName: string;
  glyph?: BrandGlyphName;
  tilt?: "left" | "right" | "none";
  className?: string;
};

const isSafe = (src: string | null | undefined): src is string =>
  Boolean(src && (src.startsWith("/") || src.startsWith("https://")));

/**
 * The UI postcard (deckled paper border, stamp, postmark) as a non-link figure
 * that can also hold a video still. The surrounding card carries the link.
 */
export function MediaPostcard({ image, video, alt, placeName, glyph = "compass", tilt = "left", className }: MediaPostcardProps) {
  const Glyph = BRAND_GLYPHS[glyph];
  const showImage = isSafe(image);
  const showVideo = !showImage && isSafe(video);
  return (
    <figure
      className={cn(
        "ui-postcard dst-postcard",
        tilt === "right" && "ui-postcard--tilt-right",
        tilt === "none" && "ui-postcard--straight",
        className
      )}
    >
      <div className="ui-postcard__paper">
        <div className="ui-postcard__deckle ui-paper">
          <div className="ui-postcard__photo">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- partner and storage images are never optimized
              <img src={image} alt={alt} loading="lazy" decoding="async" width={600} height={400} />
            ) : showVideo ? (
              <video
                className="dst-postcard__video"
                src={`${video}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                aria-label={alt}
                tabIndex={-1}
              />
            ) : (
              <div className="ui-postcard__fallback">
                <Glyph />
                <span>{placeName}</span>
              </div>
            )}
          </div>
        </div>
        <span className="ui-postcard__stamp" aria-hidden="true">
          <span className="ui-postcard__stamp-inner">
            <Glyph />
          </span>
        </span>
        <span className="ui-postcard__postmark" aria-hidden="true" />
        <CancelLines className="ui-postcard__cancel" />
      </div>
    </figure>
  );
}
