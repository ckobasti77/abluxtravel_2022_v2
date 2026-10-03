"use client";

import {
  BedDoubleIcon,
  ChevronDownIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import AdminPageHeader from "./admin/admin-page-header";
import AccommodationEditor from "./accommodation-editor";
import DestinationsDataTable from "./admin/destinations-data-table";
import DestinationSlideOver from "./admin/destination-slide-over";
import TripSlideOver from "./admin/trip-slide-over";
import InlineCategories from "./inline-categories";
import { useSitePreferences } from "./site-preferences-provider";
import type { Destination } from "../lib/use-destinations";
import { useJourneys } from "../lib/use-journeys";
import {
  Trip,
  TripStatus,
  sortTripsNewestFirst,
  useTrips,
} from "../lib/use-trips";

const formatDate = (value: string, language: string) => {
  if (!value) return language === "sr" ? "Bez datuma" : "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "sr" ? "sr-Latn-RS" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const statusTone = (status: TripStatus) => {
  if (status === "active") {
    return "border-[var(--ablux-line)] bg-[var(--success-soft)] text-[var(--ablux-teal-text)]";
  }
  if (status === "upcoming") {
    return "border-[var(--ablux-line)] bg-[color-mix(in_srgb,var(--ablux-ochre)_14%,transparent)] text-[var(--ablux-accent-text)]";
  }
  return "border-[var(--ablux-line)] bg-[var(--ablux-surface-2)] text-[var(--ablux-text-muted)]";
};

type TripEditorProps = {
  mode?: "arrangements" | "putovanja";
};

export default function TripEditor({ mode = "arrangements" }: TripEditorProps) {
  const { dictionary, language } = useSitePreferences();
  const arrangementTrips = useTrips();
  const journeyTrips = useJourneys({ includeInactive: true });
  const removeTrip = useMutation(api.trips.remove);
  const removeJourney = useMutation(api.slides.remove);
  const isPutovanja = mode === "putovanja";
  const trips = isPutovanja ? journeyTrips : arrangementTrips;
  const sectionLabel =
    language === "sr"
      ? isPutovanja
        ? "Putovanja"
        : "Aranžmani"
      : isPutovanja
        ? "Trips"
        : "Packages";
  const singularLabel =
    language === "sr"
      ? isPutovanja
        ? "putovanje"
        : "aranžman"
      : isPutovanja
        ? "trip"
        : "package";
  const adminHref = isPutovanja ? "/admin/putovanja" : "/admin/aranzmani";

  const [tripSlideOverOpen, setTripSlideOverOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [expandedDestinationTripIds, setExpandedDestinationTripIds] = useState<
    Set<string>
  >(new Set());
  const [expandedAccommodationTripIds, setExpandedAccommodationTripIds] =
    useState<Set<string>>(new Set());
  const [destinationSlideOverOpen, setDestinationSlideOverOpen] =
    useState(false);
  const [destinationTripId, setDestinationTripId] = useState("");
  const [destinationPageSlug, setDestinationPageSlug] = useState("");
  const [editingDestination, setEditingDestination] =
    useState<Destination | null>(null);

  const t = dictionary.tripDetail;

  const sortedTrips = useMemo(() => sortTripsNewestFirst(trips), [trips]);

  const activeCount = sortedTrips.filter((trip) => trip.status === "active").length;
  const destinationCount = sortedTrips.reduce(
    (total, trip) => total + (trip.destinationCount ?? 0),
    0
  );

  const statusLabel = (status: TripStatus) => {
    if (status === "active") return t.statusActive;
    if (status === "upcoming") return t.statusUpcoming;
    return t.statusCompleted;
  };

  const openNewTrip = () => {
    setEditingTrip(null);
    setTripSlideOverOpen(true);
  };

  const openEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setTripSlideOverOpen(true);
  };

  const closeTripSlideOver = () => {
    setTripSlideOverOpen(false);
    setEditingTrip(null);
  };

  const handleDelete = async (tripId: string) => {
    const confirmed = window.confirm(
      language === "sr"
        ? `Obrisati ovo ${singularLabel}?`
        : `Delete this ${singularLabel}?`
    );
    if (!confirmed) return;
    if (isPutovanja) {
      await removeJourney({ id: tripId as Id<"slides"> });
    } else {
      await removeTrip({ id: tripId as Id<"trips"> });
    }
    if (editingTrip?._id === tripId) {
      closeTripSlideOver();
    }
  };

  const toggleTripDestinations = (tripId: string) => {
    setExpandedDestinationTripIds((previous) => {
      const next = new Set(previous);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const toggleTripAccommodations = (tripId: string) => {
    setExpandedAccommodationTripIds((previous) => {
      const next = new Set(previous);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const openNewDestination = (trip: Trip) => {
    setEditingDestination(null);
    setDestinationTripId(isPutovanja ? "" : trip._id);
    setDestinationPageSlug(isPutovanja ? trip.slug : "");
    setDestinationSlideOverOpen(true);
  };

  const openEditDestination = (destination: Destination, trip: Trip) => {
    setEditingDestination(destination);
    setDestinationTripId(isPutovanja ? "" : trip._id);
    setDestinationPageSlug(isPutovanja ? trip.slug : "");
    setDestinationSlideOverOpen(true);
  };

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    {
      label: sectionLabel,
      href: adminHref,
    },
  ];

  return (
    <section className="grid gap-6">
      <AdminPageHeader
        breadcrumbs={breadcrumbs}
        title={
          language === "sr"
            ? `Pregled ${sectionLabel.toLowerCase()}`
            : `${sectionLabel} overview`
        }
        subtitle={
          language === "sr"
            ? `${sectionLabel} su odvojeni u bazi, ali koriste isti editor i isti prikaz destinacija.`
            : `${sectionLabel} use a separate database table while sharing the same editor and destinations UI.`
        }
        actions={[
          {
            label:
              language === "sr"
                ? `Novo ${singularLabel}`
                : `New ${singularLabel}`,
            onClick: openNewTrip,
          },
        ]}
      />

      {isPutovanja ? null : <InlineCategories type="arrangement" />}

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="surface rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {language === "sr" ? `Ukupno: ${sectionLabel}` : `Total ${sectionLabel}`}
          </p>
          <p className="mt-2 text-2xl font-semibold">{sortedTrips.length}</p>
        </article>
        <article className="surface rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {dictionary.admin.active}
          </p>
          <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
        </article>
        <article className="surface rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {language === "sr" ? "Destinacije" : "Destinations"}
          </p>
          <p className="mt-2 text-2xl font-semibold">{destinationCount}</p>
        </article>
      </div>

      {sortedTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg-soft)] px-4 py-12 text-center">
          <p className="text-sm font-semibold">
            {language === "sr"
              ? `Nema ${sectionLabel.toLowerCase()}`
              : `No ${sectionLabel.toLowerCase()} yet`}
          </p>
          <p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted)]">
            {language === "sr"
              ? `Dodajte prvo ${singularLabel}, pa zatim otvorite destinacije za konkretne ponude.`
              : `Add the first ${singularLabel}, then open destinations for concrete offers.`}
          </p>
        </div>
      ) : null}

      <div className="stagger-grid grid gap-4">
        {sortedTrips.map((trip, index) => {
          const isExpanded = expandedDestinationTripIds.has(trip._id);
          const accommodationsExpanded = expandedAccommodationTripIds.has(
            trip._id
          );
          const detailPreview = trip.detailMedia?.find((media) => media.url);
          const heroMediaUrl =
            trip.heroMediaUrl || detailPreview?.url || trip.imageUrls.find(Boolean);
          const heroMediaType = trip.heroMediaUrl
            ? trip.heroMediaType
            : detailPreview?.mediaType ?? "image";
          const destinationLabel =
            language === "sr"
              ? `${trip.destinationCount ?? 0} destinacija`
              : `${trip.destinationCount ?? 0} destinations`;

          return (
            <article
              key={trip._id}
              className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]"
              style={{ "--stagger-index": index } as CSSProperties}
            >
              <div className="grid gap-3 p-3 sm:grid-cols-[132px_1fr_auto] sm:items-center sm:p-4">
                <div className="h-28 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] sm:h-20">
                  {heroMediaUrl ? (
                    heroMediaType === "video" ? (
                      <video
                        src={heroMediaUrl}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <CmsImage
                        src={heroMediaUrl}
                        alt={trip.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">
                      {language === "sr" ? "Nema medija" : "No media"}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-bold">{trip.title}</p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(
                        trip.status
                      )}`}
                    >
                      {statusLabel(trip.status)}
                    </span>
                    {trip.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
                        <StarIcon strokeWidth={1.5} size="1em" fill="currentColor" className="text-[9px]" />
                        {t.featured}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    /{trip.slug} · {formatDate(trip.departureDate, language)} ·{" "}
                    {destinationLabel}
                  </p>
                  <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                    {trip.description ||
                      (language === "sr"
                        ? `Roditeljsko ${singularLabel} za povezane destinacije.`
                        : `Parent ${singularLabel} for connected destinations.`)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEditTrip(trip)}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  >
                    <PencilIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                    {language === "sr" ? "Uredi" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTripDestinations(trip._id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                      isExpanded
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    }`}
                  >
                    <MapPinIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                    {language === "sr" ? "Destinacije" : "Destinations"}
                    <ChevronDownIcon strokeWidth={1.5} size="1em"
                      className={`text-[10px] transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {!isPutovanja ? (
                    <button
                      type="button"
                      onClick={() => toggleTripAccommodations(trip._id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                        accommodationsExpanded
                          ? "border-[var(--primary)] text-[var(--primary)]"
                          : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      }`}
                    >
                      <BedDoubleIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                      {language === "sr" ? "Smeštaj" : "Accommodation"}
                      <ChevronDownIcon strokeWidth={1.5} size="1em"
                        className={`text-[10px] transition-transform ${
                          accommodationsExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDelete(trip._id)}
                    className="flex items-center justify-center rounded-lg border border-[var(--line)] p-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--ablux-brick)] hover:text-[var(--ablux-brick)]"
                    aria-label={
                      language === "sr"
                        ? `Obriši ${singularLabel}`
                        : `Delete ${singularLabel}`
                    }
                    title={
                      language === "sr"
                        ? `Obriši ${singularLabel}`
                        : `Delete ${singularLabel}`
                    }
                  >
                    <TrashIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="border-t border-[var(--line)] bg-[var(--bg-soft)] p-3 sm:p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {language === "sr"
                          ? `Destinacije za: ${trip.title}`
                          : `Destinations for: ${trip.title}`}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {language === "sr"
                          ? "Ovde se dodaju konkretne ponude, cene, datumi i subagenture."
                          : "Add concrete offers, pricing, dates, and subagencies here."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openNewDestination(trip)}
                      className="btn-primary self-start !min-h-9 !px-3 !py-2 !text-xs sm:self-auto"
                    >
                      <PlusIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                      {language === "sr" ? "Nova destinacija" : "New destination"}
                    </button>
                  </div>
                  <DestinationsDataTable
                    tripId={isPutovanja ? undefined : trip._id}
                    pageSlug={isPutovanja ? trip.slug : undefined}
                    offerMode
                    onEdit={(destination) => openEditDestination(destination, trip)}
                  />
                </div>
              ) : null}

              {!isPutovanja && accommodationsExpanded ? (
                <div className="border-t border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      {language === "sr"
                        ? `Smeštaj za: ${trip.title}`
                        : `Accommodation for: ${trip.title}`}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {language === "sr"
                        ? "Opcije smeštaja ostaju vezane za izabrani aranžman."
                        : "Accommodation options remain connected to the selected package."}
                    </p>
                  </div>
                  <AccommodationEditor tripId={trip._id} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {tripSlideOverOpen ? (
        <TripSlideOver
          key={editingTrip ? `edit-${mode}-${editingTrip._id}` : `new-${mode}`}
          open={tripSlideOverOpen}
          trip={editingTrip}
          source={mode}
          onClose={closeTripSlideOver}
        />
      ) : null}

      {destinationSlideOverOpen ? (
        <DestinationSlideOver
          key={
            editingDestination
              ? `edit-${editingDestination._id}`
              : `new-${destinationTripId || destinationPageSlug}`
          }
          open={destinationSlideOverOpen}
          destination={editingDestination}
          tripId={destinationTripId || undefined}
          pageSlug={destinationPageSlug || undefined}
          offerMode
          onClose={() => {
            setDestinationSlideOverOpen(false);
            setEditingDestination(null);
            setDestinationTripId("");
            setDestinationPageSlug("");
          }}
        />
      ) : null}
    </section>
  );
}
