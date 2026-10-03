"use client";

import {
  ChurchIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import CmsImage from "@/components/cms-image";
import { useMemo, useState, type CSSProperties } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import AdminPageHeader from "./admin/admin-page-header";
import { formatMoney } from "../lib/admin/format";
import ReligiousOfferSlideOver from "./admin/religious-offer-slide-over";
import InlineCategories from "./inline-categories";
import { useSitePreferences } from "./site-preferences-provider";
import { useCategories } from "../lib/use-categories";
import { useOffersLiveBoard, type AggregatedOffer } from "../lib/use-offers";
import {
  MANUAL_RELIGIOUS_SOURCE_SLUG,
  isReligiousOffer,
} from "../lib/religious";

type SourceFilter = "all" | "manual" | "external";

const isManualReligiousOffer = (offer: AggregatedOffer) =>
  offer.sourceSlug.toLowerCase() === MANUAL_RELIGIOUS_SOURCE_SLUG;

// Stored currencies include "ДИН" (old religious offers); Intl only knows ISO codes.
const formatPrice = (offer: AggregatedOffer, locale: string) => {
  void locale;
  return formatMoney(offer.price, /^(RSD|ДИН|DIN)$/i.test(offer.currency) ? "RSD" : offer.currency);
};

const formatDate = (value: string | undefined, language: "sr" | "en") => {
  if (!value) return language === "sr" ? "Bez datuma" : "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "sr" ? "sr-Latn-RS" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateRange = (offer: AggregatedOffer, language: "sr" | "en") => {
  const departure = formatDate(offer.departureDate, language);
  if (!offer.returnDate) return departure;
  return `${departure} - ${formatDate(offer.returnDate, language)}`;
};

const formatTagLabel = (tag: string, language: "sr" | "en") => {
  if (language !== "sr") return tag;

  const normalized = tag.trim().toLowerCase();
  if (normalized === "hodocasce") return "hodočašće";

  return tag;
};

function StatCard({
  label,
  value,
  detail,
  index,
}: {
  label: string;
  value: string | number;
  detail?: string;
  index: number;
}) {
  return (
    <article
      className="surface fx-lift rounded-xl p-4"
      style={{ "--stagger-index": index } as CSSProperties}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
      ) : null}
    </article>
  );
}

export default function ReligiousOffersEditor() {
  const { language } = useSitePreferences();
  const locale = language === "sr" ? "sr-Latn-RS" : "en-US";
  const deactivateOffer = useMutation(api.offers.deactivateOffer);
  const offers = useOffersLiveBoard(undefined, []);
  const religiousCategories = useCategories("religious");

  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AggregatedOffer | null>(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [status, setStatus] = useState<string | null>(null);
  const [busyOfferKey, setBusyOfferKey] = useState<string | null>(null);

  const religiousOffers = useMemo(
    () =>
      offers
        .filter((offer) => isReligiousOffer(offer))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [offers]
  );

  const categoryLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const category of religiousCategories) {
      labels.set(category._id, language === "sr" ? category.name.sr : category.name.en);
    }
    return labels;
  }, [language, religiousCategories]);

  const manualOffers = useMemo(
    () => religiousOffers.filter((offer) => isManualReligiousOffer(offer)),
    [religiousOffers]
  );

  const filteredOffers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return religiousOffers.filter((offer) => {
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "manual" && isManualReligiousOffer(offer)) ||
        (sourceFilter === "external" && !isManualReligiousOffer(offer));

      if (!matchesSource) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        offer.title,
        offer.destination,
        offer.departureCity ?? "",
        offer.externalId,
        offer.sourceSlug,
        offer.navTitle ?? "",
        offer.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [query, religiousOffers, sourceFilter]);

  const offersWithPdf = religiousOffers.filter((offer) => offer.pdfUrl).length;
  const offersWithImages = religiousOffers.filter(
    (offer) => offer.imageUrls && offer.imageUrls.length > 0
  ).length;

  const openNewOffer = () => {
    setEditingOffer(null);
    setSlideOverOpen(true);
  };

  const openEditOffer = (offer: AggregatedOffer) => {
    setEditingOffer(offer);
    setSlideOverOpen(true);
  };

  const closeSlideOver = () => {
    setSlideOverOpen(false);
    setEditingOffer(null);
  };

  const handleDeactivate = async (offer: AggregatedOffer) => {
    if (busyOfferKey) return;

    const confirmed = window.confirm(
      language === "sr"
        ? "Da li sigurno želite da deaktivirate ovu ponudu?"
        : "Are you sure you want to deactivate this offer?"
    );
    if (!confirmed) return;

    const offerKey = `${offer.sourceSlug}:${offer.externalId}`;
    setBusyOfferKey(offerKey);
    setStatus(language === "sr" ? "Deaktiviranje ponude..." : "Deactivating offer...");

    try {
      await deactivateOffer({
        sourceSlug: offer.sourceSlug,
        externalId: offer.externalId,
      });
      setStatus(language === "sr" ? "Ponuda je deaktivirana." : "Offer has been deactivated.");

      if (editingOffer?.externalId === offer.externalId) {
        closeSlideOver();
      }
    } catch {
      setStatus(
        language === "sr"
          ? "Deaktiviranje nije uspelo."
          : "Could not deactivate the offer."
      );
    } finally {
      setBusyOfferKey(null);
    }
  };

  const filters: { value: SourceFilter; label: string; count: number }[] = [
    {
      value: "all",
      label: language === "sr" ? "Sve" : "All",
      count: religiousOffers.length,
    },
    {
      value: "manual",
      label: language === "sr" ? "Ručno" : "Manual",
      count: manualOffers.length,
    },
    {
      value: "external",
      label: language === "sr" ? "Iz izvora" : "External",
      count: religiousOffers.length - manualOffers.length,
    },
  ];

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    {
      label: language === "sr" ? "Verski turizam" : "Religious tourism",
      href: "/admin/verski-turizam",
    },
  ];

  return (
    <section className="grid gap-6">
      <AdminPageHeader
        breadcrumbs={breadcrumbs}
        title={language === "sr" ? "Verski turizam" : "Religious tourism"}
        subtitle={
          language === "sr"
            ? "Centralni pregled hodočašća i verskih tura sa brzim dodavanjem kroz desni editor."
            : "Central overview for pilgrimage and faith-focused tours with quick creation in the right-side editor."
        }
        actions={[
          {
            label: language === "sr" ? "Novo versko putovanje" : "New religious trip",
            onClick: openNewOffer,
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="stagger-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={language === "sr" ? "Ukupno verskih" : "Total religious"}
            value={religiousOffers.length}
            detail={language === "sr" ? "Aktivne ponude u pregledu" : "Active offers in view"}
            index={0}
          />
          <StatCard
            label={language === "sr" ? "Ručno uređene" : "Manually managed"}
            value={manualOffers.length}
            detail={MANUAL_RELIGIOUS_SOURCE_SLUG}
            index={1}
          />
          <StatCard
            label={language === "sr" ? "Sa PDF-om" : "With PDF"}
            value={offersWithPdf}
            detail={language === "sr" ? "Brošure spremne za pregled" : "Brochures ready to view"}
            index={2}
          />
          <StatCard
            label={language === "sr" ? "Sa slikama" : "With images"}
            value={offersWithImages}
            detail={language === "sr" ? "Ponude sa galerijom" : "Offers with gallery media"}
            index={3}
          />
        </div>

        <article className="surface rounded-xl p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <ChurchIcon strokeWidth={1.5} size="1em" className="text-sm" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {language === "sr" ? "Kategorije verskih ponuda" : "Religious offer categories"}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
                {language === "sr"
                  ? "Iste kategorije se koriste i u desnom editoru."
                  : "The same categories are available in the slide-over editor."}
              </p>
            </div>
          </div>
          <InlineCategories type="religious" />
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="border-b border-[var(--line)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {language === "sr" ? "Aktivne verske ponude" : "Active religious offers"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {language === "sr"
                  ? "Pregled, izmena ručnih ponuda i deaktivacija ostaju na jednom mestu."
                  : "Review, edit manual offers, and deactivate offers from one place."}
              </p>
            </div>
            {status ? (
              <p className="rounded-lg border border-[var(--line)] bg-[var(--primary-soft)] px-3 py-2 text-sm text-[var(--text)]">
                {status}
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="grid gap-1.5">
              <span className="sr-only">
                {language === "sr" ? "Pretraga verskih ponuda" : "Search religious offers"}
              </span>
              <input
                className="control !min-h-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  language === "sr"
                    ? "Pretraži po nazivu, destinaciji, ID-u, tagu..."
                    : "Search by title, destination, ID, tag..."
                }
              />
            </label>

            <div className="flex rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] p-1">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSourceFilter(filter.value)}
                  className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                    sourceFilter === filter.value
                      ? "bg-[var(--surface-strong)] text-[var(--text)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {filter.label} {filter.count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredOffers.length > 0 ? (
          <div className="divide-y divide-[var(--line)]">
            {filteredOffers.map((offer, index) => {
              const isManual = isManualReligiousOffer(offer);
              const offerKey = `${offer.sourceSlug}:${offer.externalId}`;
              const categoryLabel = offer.categoryId
                ? categoryLabels.get(offer.categoryId)
                : undefined;
              const coverImage = offer.imageUrls?.find(Boolean);

              return (
                <article
                  key={offer.id}
                  className="grid gap-4 p-4 transition hover:bg-[var(--bg-soft)] sm:p-5 xl:grid-cols-[128px_minmax(0,1fr)_190px] xl:items-start"
                  style={{ "--stagger-index": index } as CSSProperties}
                >
                  <div className="h-28 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] xl:h-24">
                    {coverImage ? (
                      <CmsImage
                        src={coverImage}
                        alt={offer.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-[var(--muted)]">
                        {language === "sr" ? "Bez slike" : "No image"}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 text-base font-bold">{offer.title}</h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          isManual
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "border-[var(--line)] bg-[var(--bg-soft)] text-[var(--muted)]"
                        }`}
                      >
                        {isManual
                          ? language === "sr"
                            ? "Ručno"
                            : "Manual"
                          : offer.sourceSlug}
                      </span>
                      {categoryLabel ? (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
                          {categoryLabel}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                        {offer.destination}
                      </span>
                      <span>{formatDateRange(offer, language)}</span>
                      <span>
                        {language === "sr" ? "Polazak" : "Departure"}:{" "}
                        {offer.departureCity || "-"}
                      </span>
                      <span>ID: {offer.externalId}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {offer.tags.slice(0, 5).map((tag) => (
                        <span
                          key={`${offer.id}-${tag}`}
                          className="rounded-full border border-[var(--line)] bg-[var(--primary-soft)] px-2.5 py-1 text-xs"
                        >
                          {formatTagLabel(tag, language)}
                        </span>
                      ))}
                      {offer.tags.length > 5 ? (
                        <span className="text-xs text-[var(--muted)]">
                          +{offer.tags.length - 5}
                        </span>
                      ) : null}
                    </div>

                    {offer.pdfUrl ? (
                      <details className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
                          {language === "sr" ? "PDF brošura i pregled" : "PDF brochure and preview"}
                        </summary>
                        <div className="mt-3 grid gap-3">
                          <a
                            href={offer.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-fit rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          >
                            {language === "sr" ? "Otvori PDF" : "Open PDF"}
                          </a>
                          <iframe
                            src={`${offer.pdfUrl}#toolbar=1&navpanes=0`}
                            className="h-56 w-full rounded-lg border border-[var(--line)] bg-white"
                            title={`${offer.title}-pdf-preview`}
                          />
                        </div>
                      </details>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <div className="xl:text-right">
                      <p className="text-2xl font-semibold">{formatPrice(offer, locale)}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {language === "sr" ? "Mesta" : "Seats"}:{" "}
                        {typeof offer.seatsLeft === "number" ? offer.seatsLeft : "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {isManual ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          onClick={() => openEditOffer(offer)}
                          disabled={Boolean(busyOfferKey)}
                        >
                          <PencilIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                          {language === "sr" ? "Izmeni" : "Edit"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--ablux-brick)] hover:text-[var(--ablux-brick)]"
                        onClick={() => void handleDeactivate(offer)}
                        disabled={Boolean(busyOfferKey)}
                      >
                        <TrashIcon strokeWidth={1.5} size="1em" className="text-[10px]" />
                        {busyOfferKey === offerKey
                          ? language === "sr"
                            ? "Radim..."
                            : "Working..."
                          : language === "sr"
                            ? "Deaktiviraj"
                            : "Deactivate"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <ChurchIcon strokeWidth={1.5} size="1em" className="text-lg" />
            </span>
            <h3 className="mt-4 text-base font-semibold">
              {language === "sr" ? "Nema ponuda za ovaj prikaz" : "No offers in this view"}
            </h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-[var(--muted)]">
              {language === "sr"
                ? "Promenite pretragu ili dodajte novo versko putovanje kroz dugme u zaglavlju."
                : "Adjust search or add a new religious trip from the page header."}
            </p>
          </div>
        )}
      </section>

      {slideOverOpen ? (
        <ReligiousOfferSlideOver
          key={editingOffer ? `edit-${editingOffer.id}-${editingOffer.updatedAt}` : "new-religious-offer"}
          open={slideOverOpen}
          offer={editingOffer}
          onClose={closeSlideOver}
          onSaved={(message) => setStatus(message)}
        />
      ) : null}
    </section>
  );
}
