import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_GLYPHS, CancelLines, type BrandGlyphName } from "./brand-glyphs";
import { cn } from "./cn";

type PostcardProps = {
  /** Photo. http:// images are never shown (mixed content); the fallback is used instead. */
  image?: { src: string; alt: string } | null;
  /** Destination name for the fallback and the caption. */
  placeName?: string;
  /** Serif italic caption below the card ("Ostrog, Crna Gora"). */
  caption?: ReactNode;
  stampGlyph?: BrandGlyphName;
  orientation?: "landscape" | "portrait";
  tilt?: "left" | "right" | "none";
  /** Postmark circles and cancel lines over the stamp. */
  postmark?: boolean;
  href?: string;
  /** Eager-load when the postcard is above the fold. */
  priority?: boolean;
  className?: string;
};

function isSafeImage(src: string) {
  return src.startsWith("/") || src.startsWith("https://") || src.startsWith("data:");
}

/** Photo in a deckled paper-edge border with a perforated stamp and postmark. */
export function Postcard({
  image,
  placeName,
  caption,
  stampGlyph = "compass",
  orientation = "landscape",
  tilt = "left",
  postmark = true,
  href,
  priority = false,
  className,
}: PostcardProps) {
  const Glyph = BRAND_GLYPHS[stampGlyph];
  const showImage = image && isSafeImage(image.src);
  const classes = cn(
    "ui-postcard",
    orientation === "portrait" && "ui-postcard--portrait",
    tilt === "right" && "ui-postcard--tilt-right",
    tilt === "none" && "ui-postcard--straight",
    className,
  );

  const body = (
    <>
      <div className="ui-postcard__paper">
        <div className="ui-postcard__deckle ui-paper">
          <div className="ui-postcard__photo">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- postcards also show partner images (no optimization)
              <img
                src={image.src}
                alt={image.alt}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                width={orientation === "portrait" ? 480 : 600}
                height={orientation === "portrait" ? 600 : 400}
              />
            ) : (
              <div className="ui-postcard__fallback">
                <Glyph />
                {placeName ? <span>{placeName}</span> : null}
              </div>
            )}
          </div>
        </div>
        <span className="ui-postcard__stamp" aria-hidden="true">
          <span className="ui-postcard__stamp-inner">
            <Glyph />
          </span>
        </span>
        {postmark ? (
          <>
            <span className="ui-postcard__postmark" aria-hidden="true" />
            <CancelLines className="ui-postcard__cancel" />
          </>
        ) : null}
      </div>
      {caption ? <p className="ui-postcard__caption">{caption}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <figure className={classes}>{body}</figure>;
}
