"use client";

import {
  PencilIcon,
  TrashIcon,
  SearchIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useSitePreferences } from "../site-preferences-provider";
import {
  Destination,
  useDestinationsByPage,
  useDestinationsByTrip,
} from "../../lib/use-destinations";

type DestinationsDataTableProps = {
  tripId?: string;
  pageSlug?: string;
  offerMode?: boolean;
  onEdit: (destination: Destination) => void;
};

export default function DestinationsDataTable({
  tripId,
  pageSlug,
  offerMode = false,
  onEdit,
}: DestinationsDataTableProps) {
  const { language } = useSitePreferences();
  const destinationsByTrip = useDestinationsByTrip(tripId, { includeInactive: true });
  const destinationsByPage = useDestinationsByPage(pageSlug, { includeInactive: true });
  const destinations = tripId ? destinationsByTrip : destinationsByPage;
  const removeDestination = useMutation(api.destinations.remove);
  const upsertDestination = useMutation(api.destinations.upsert);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return destinations;
    const q = search.toLowerCase();
    return destinations.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    );
  }, [destinations, search]);

  const handleDelete = async (id: string) => {
    const msg =
      language === "sr"
        ? "Obrisati ovu destinaciju?"
        : "Delete this destination?";
    if (!window.confirm(msg)) return;
    await removeDestination({ id: id as Id<"destinations"> });
  };

  const toggleActive = async (dest: Destination) => {
    await upsertDestination({
      id: dest._id as Id<"destinations">,
      tripId: tripId ? (tripId as Id<"trips">) : undefined,
      pageSlug: pageSlug || undefined,
      offerType: offerMode ? dest.offerType ?? "own" : dest.offerType,
      title: dest.title,
      description: dest.description,
      price: dest.price,
      currency: dest.currency,
      departureDate: dest.departureDate,
      returnDate: dest.returnDate,
      departureCity: dest.departureCity,
      durationLabel: dest.durationLabel,
      partnerName: dest.partnerName,
      partnerOfferCode: dest.partnerOfferCode,
      iframeUrl: dest.iframeUrl,
      externalUrl: dest.externalUrl,
      contactNote: dest.contactNote,
      imageStorageIds: dest.imageStorageIds as Id<"_storage">[],
      order: dest.order,
      isActive: !dest.isActive,
    });
  };

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat(language === "sr" ? "sr-Latn-RS" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);

  return (
    <section>
      {/* Search bar */}
      <div className="mb-3">
        <div className="relative max-w-xs">
          <SearchIcon strokeWidth={1.5} size="1em" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              language === "sr"
                ? "Pretraži destinaciju..."
                : "Search destination..."
            }
            className="control !pl-9 !h-9 text-sm"
          />
        </div>
      </div>

      {/* Desktop: data table */}
      <div className="hidden overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--bg-soft)]">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {language === "sr" ? "Slika" : "Image"}
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {language === "sr" ? "Naziv" : "Name"}
              </th>
              {offerMode ? (
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {language === "sr" ? "Tip" : "Type"}
                </th>
              ) : null}
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {language === "sr" ? "Cena" : "Price"}
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Status
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {language === "sr" ? "Akcije" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((dest) => (
              <tr
                key={dest._id}
                className="border-b border-[var(--line)] last:border-b-0 transition hover:bg-[var(--bg-soft)]"
              >
                <td className="px-4 py-2.5">
                  <div className="h-9 w-14 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-soft)]">
                    {dest.imageUrls[0] ? (
                      <CmsImage
                        src={dest.imageUrls[0]}
                        alt={dest.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[8px] text-[var(--muted)]">
                        -
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-medium">{dest.title}</td>
                {offerMode ? (
                  <td className="px-4 py-2.5">
                    <span className="rounded-full border border-[var(--line)] bg-[var(--bg-soft)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                      {(dest.offerType ?? "own") === "subagency"
                        ? "Subagentura"
                        : language === "sr"
                          ? "Naša ponuda"
                          : "Our offer"}
                    </span>
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-[var(--muted)]">
                  {formatPrice(dest.price, dest.currency)}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => void toggleActive(dest)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                      dest.isActive
                        ? "bg-[var(--ablux-c-teal)]"
                        : "bg-[var(--ablux-stone)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        dest.isActive
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(dest)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)] transition hover:opacity-80"
                    >
                      <PencilIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                      {language === "sr" ? "Uredi" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(dest._id)}
                      className="flex items-center justify-center rounded-lg border border-[var(--ablux-brick)] bg-[color-mix(in_srgb,var(--ablux-brick)_8%,transparent)] p-1.5 text-[var(--ablux-brick)] transition hover:bg-[color-mix(in_srgb,var(--ablux-brick)_12%,transparent)]"
                    >
                      <TrashIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={offerMode ? 6 : 5}
                  className="px-4 py-6 text-center text-sm text-[var(--muted)]"
                >
                  {search.trim()
                    ? language === "sr"
                      ? "Nema rezultata pretrage."
                      : "No search results."
                    : language === "sr"
                      ? "Nema dodatih destinacija."
                      : "No destinations added yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className="grid gap-2 sm:hidden">
        {filtered.map((dest) => (
          <div
            key={dest._id}
            className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
          >
            {/* Thumbnail */}
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-soft)]">
              {dest.imageUrls[0] ? (
                <CmsImage
                  src={dest.imageUrls[0]}
                  alt={dest.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[8px] text-[var(--muted)]">
                  -
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{dest.title}</p>
              <p className="text-xs text-[var(--muted)]">
                {offerMode ? (
                  <>
                    {(dest.offerType ?? "own") === "subagency"
                      ? "Subagentura"
                      : language === "sr"
                        ? "Naša ponuda"
                        : "Our offer"}{" "}
                    ·{" "}
                  </>
                ) : null}
                {formatPrice(dest.price, dest.currency)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => void toggleActive(dest)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  dest.isActive
                    ? "bg-[var(--ablux-c-teal)]"
                    : "bg-[var(--ablux-stone)]"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    dest.isActive
                      ? "translate-x-4"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => onEdit(dest)}
                className="flex items-center justify-center rounded-lg border border-[var(--line)] p-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--primary)]"
              >
                <PencilIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(dest._id)}
                className="flex items-center justify-center rounded-lg border border-[var(--line)] p-1.5 text-[var(--ablux-brick)] transition hover:bg-[color-mix(in_srgb,var(--ablux-brick)_12%,transparent)]"
              >
                <TrashIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
            {search.trim()
              ? language === "sr"
                ? "Nema rezultata pretrage."
                : "No search results."
              : language === "sr"
                ? "Nema dodatih destinacija."
                : "No destinations added yet."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

