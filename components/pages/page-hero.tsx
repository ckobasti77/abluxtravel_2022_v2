import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../ui/cn";

export type PageCrumb = { href?: string; label: string };

type PageHeroProps = {
  /** Gold overline above the title ("VERSKI TURIZAM"). */
  overline?: ReactNode;
  /** Serif title; wrap the one emphasis word in <em>. */
  title: ReactNode;
  intro?: ReactNode;
  /** Background photo or poster (ink gradient on the left keeps the copy readable). */
  image?: { src: string; mobileSrc?: string; alt?: string; position?: string } | null;
  /** Replaces the image, e.g. a <SceneMedia> clip from the hero manifest. */
  media?: ReactNode;
  actions?: ReactNode;
  /** Paper object on the right (postcard, stamp) on wide screens. */
  aside?: ReactNode;
  crumbs?: PageCrumb[];
  size?: "md" | "lg";
  className?: string;
  /** Extra content under the actions (facts, chips). */
  children?: ReactNode;
};

/**
 * Ink page hero for the public pages (step 12). Marked with [data-page-hero],
 * so the navigation stays transparent over it and the search pill appears after it.
 */
export function PageHero({ overline, title, intro, image, media, actions, aside, crumbs, size = "md", className, children }: PageHeroProps) {
  return (
    <section className={cn("pg-hero", size === "lg" && "pg-hero--lg", Boolean(aside) && "pg-hero--aside", className)} data-page-hero>
      <div className="pg-hero__media" aria-hidden={image?.alt ? undefined : true}>
        {media ??
          (image ? (
            <picture>
              {image.mobileSrc ? <source media="(max-width: 767px)" srcSet={image.mobileSrc} /> : null}
              <img
                src={image.src}
                alt={image.alt ?? ""}
                fetchPriority="high"
                decoding="async"
                style={image.position ? { objectPosition: image.position } : undefined}
              />
            </picture>
          ) : null)}
      </div>
      <div className="pg-hero__shade" aria-hidden="true" />
      <div className="pg-hero__inner">
        <div className="pg-hero__copy">
          {crumbs?.length ? (
            <nav aria-label="Breadcrumb" className="pg-crumbs">
              <ol>
                {crumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} aria-current={index === crumbs.length - 1 ? "page" : undefined}>
                    {crumb.href && index < crumbs.length - 1 ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {overline ? <p className="pg-hero__overline">{overline}</p> : null}
          <h1 className="pg-hero__title">{title}</h1>
          {intro ? <p className="pg-hero__intro">{intro}</p> : null}
          {actions ? <div className="pg-hero__actions">{actions}</div> : null}
          {children}
        </div>
        {aside ? <div className="pg-hero__aside">{aside}</div> : null}
      </div>
    </section>
  );
}
