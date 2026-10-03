"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import CmsImage from "./cms-image";

export type LightboxImage = {
  src: string;
  alt: string;
};

type ImageLightboxProps = {
  images: LightboxImage[];
  activeIndex: number | null;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  onActiveIndexChange: (index: number | null) => void;
};

export default function ImageLightbox({
  images,
  activeIndex,
  closeLabel,
  previousLabel,
  nextLabel,
  onActiveIndexChange,
}: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentIndex =
    activeIndex === null || !images.length
      ? -1
      : Math.min(Math.max(activeIndex, 0), images.length - 1);
  const currentImage = currentIndex >= 0 ? images[currentIndex] : null;
  const canBrowse = images.length > 1;

  const close = useCallback(() => {
    onActiveIndexChange(null);
  }, [onActiveIndexChange]);

  const showPrevious = useCallback(() => {
    if (!canBrowse || currentIndex < 0) {
      return;
    }
    onActiveIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [canBrowse, currentIndex, images.length, onActiveIndexChange]);

  const showNext = useCallback(() => {
    if (!canBrowse || currentIndex < 0) {
      return;
    }
    onActiveIndexChange((currentIndex + 1) % images.length);
  }, [canBrowse, currentIndex, images.length, onActiveIndexChange]);

  useEffect(() => {
    if (!currentImage) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [currentImage]);

  useEffect(() => {
    if (!currentImage) {
      return;
    }

    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
      if (event.key === "ArrowLeft") {
        showPrevious();
      }
      if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, currentImage, showNext, showPrevious]);

  if (!currentImage) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={currentImage.alt}
      tabIndex={-1}
      className="fixed inset-0 z-[160] grid place-items-center bg-black/92 p-4 outline-none"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
        aria-label={closeLabel}
        onClick={close}
      >
        <XIcon strokeWidth={1.5} size="1em" aria-hidden />
      </button>

      {canBrowse ? (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:left-5"
            aria-label={previousLabel}
            onClick={showPrevious}
          >
            <ChevronLeftIcon strokeWidth={1.5} size="1em" aria-hidden />
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:right-5"
            aria-label={nextLabel}
            onClick={showNext}
          >
            <ChevronRightIcon strokeWidth={1.5} size="1em" aria-hidden />
          </button>
        </>
      ) : null}

      <figure className="grid max-h-[90vh] max-w-[94vw] justify-items-center gap-3">
        <CmsImage
          src={currentImage.src}
          alt={currentImage.alt}
          className="h-auto max-h-[82vh] w-auto max-w-[94vw] rounded-xl object-contain"
          loading="eager"
        />
        <figcaption className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur">
          {currentIndex + 1} / {images.length}
        </figcaption>
      </figure>
    </div>
  );
}
