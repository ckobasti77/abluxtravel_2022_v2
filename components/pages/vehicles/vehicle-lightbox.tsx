"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";

export type VehiclePhoto = { src: string; alt: string };

type VehicleLightboxProps = {
  photos: VehiclePhoto[];
  /** Index of the open photo; null keeps the dialog closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  labels: { close: string; previous: string; next: string; counter: (current: number, total: number) => string };
};

/**
 * Photo viewer for the vehicle galleries. A native <dialog> opened with
 * showModal(): the browser traps focus, Esc closes and focus returns to the
 * thumbnail. Arrow keys browse. Real photos are shown as they are (no crop).
 */
export function VehicleLightbox({ photos, index, onIndexChange, labels }: VehicleLightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const open = index !== null && photos.length > 0;
  const current = open ? photos[Math.min(Math.max(index, 0), photos.length - 1)] : null;
  const total = photos.length;
  const position = open ? Math.min(Math.max(index, 0), total - 1) : 0;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      returnFocus.current?.focus?.();
      onIndexChange(null);
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onIndexChange]);

  const step = (delta: number) => onIndexChange((position + delta + total) % total);

  return (
    <dialog
      ref={ref}
      className="veh-lightbox"
      aria-label={current?.alt}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
      onKeyDown={(event) => {
        if (total < 2) return;
        if (event.key === "ArrowLeft") step(-1);
        if (event.key === "ArrowRight") step(1);
      }}
    >
      {current ? (
        <>
          <button type="button" className="veh-lightbox__btn veh-lightbox__close" aria-label={labels.close} onClick={() => ref.current?.close()}>
            <X aria-hidden="true" strokeWidth={1.5} />
          </button>
          <figure className="veh-lightbox__figure">
            {/* eslint-disable-next-line @next/next/no-img-element -- real ABLux photos from Convex storage (no optimizer quota) */}
            <img src={current.src} alt={current.alt} decoding="async" />
            <figcaption className="veh-lightbox__caption">
              <span>{current.alt}</span>
              {total > 1 ? <span className="veh-lightbox__count">{labels.counter(position + 1, total)}</span> : null}
            </figcaption>
          </figure>
          {total > 1 ? (
            <>
              <button type="button" className="veh-lightbox__btn veh-lightbox__prev" aria-label={labels.previous} onClick={() => step(-1)}>
                <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
              </button>
              <button type="button" className="veh-lightbox__btn veh-lightbox__next" aria-label={labels.next} onClick={() => step(1)}>
                <ChevronRight aria-hidden="true" strokeWidth={1.5} />
              </button>
            </>
          ) : null}
        </>
      ) : null}
    </dialog>
  );
}
