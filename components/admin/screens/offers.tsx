"use client";

// "Ponude": ABLux programs and partner offers in one table. Search, filters,
// bulk publish/hide/feature with undo, and a drawer with ABLux overrides that
// survive every re-import.
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ExternalLink, Eye, EyeOff, SlidersHorizontal, Star, StarOff, Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorCode, formatDate, formatMoney, formatWhen, useAdminT } from "../../../lib/admin/format";
import { CHANGE_TYPE, errorMessage, offerState, pick, PRICE_BASIS } from "../../../lib/admin/labels";
import { TRAVEL_TYPES } from "../../../lib/search/travel-types";
import { Badge, Button, ButtonLink, Chip, EmptyState, Field, Input, Select, StatusDot, Textarea, useToast } from "../../ui";
import { BulkBar, Notice, PageIntro, Panel, PriceChange, Sheet, SkeletonRows, Switch, Thumb } from "../kit";

type BulkAction = "publish" | "unpublish" | "hide" | "unhide" | "feature" | "unfeature";
type StateFilter = "" | "public" | "unpublished" | "hidden" | "inactive" | "removed";

const INVERSE: Record<BulkAction, BulkAction> = {
  publish: "unpublish",
  unpublish: "publish",
  hide: "unhide",
  unhide: "hide",
  feature: "unfeature",
  unfeature: "feature",
};

type FlagRow = { _id: string; published: boolean; hidden: boolean; featured: boolean };

/** Would this action change the row? (Undo only reverts rows that really changed.) */
function changes(row: FlagRow, action: BulkAction) {
  switch (action) {
    case "publish":
      return !row.published;
    case "unpublish":
      return row.published;
    case "hide":
      return !row.hidden;
    case "unhide":
      return row.hidden;
    case "feature":
      return !row.featured;
    case "unfeature":
      return row.featured;
  }
}

export function useOfferBulk() {
  const { t, language } = useAdminT();
  const toast = useToast();
  const bulkUpdate = useMutation(api.offerAdmin.bulkUpdate);

  const doneLabel: Record<BulkAction, [string, string]> = {
    publish: ["objavljeno", "published"],
    unpublish: ["skinuto sa objave", "unpublished"],
    hide: ["sakriveno", "hidden"],
    unhide: ["vraćeno na sajt", "shown again"],
    feature: ["istaknuto", "featured"],
    unfeature: ["bez isticanja", "no longer featured"],
  };

  return async (rows: FlagRow[], action: BulkAction) => {
    const ids = rows.filter((row) => changes(row, action)).map((row) => row._id);
    if (ids.length === 0) {
      toast.show({ message: t("Izabrane ponude su već u tom stanju.", "The selected offers are already in that state.") });
      return 0;
    }
    try {
      const result = await bulkUpdate({ cardIds: ids, action });
      const [sr, en] = doneLabel[action];
      toast.show({
        message: language === "en" ? `${result.changed} offers ${en}.` : `Ponuda: ${result.changed} · ${sr}.`,
        action: {
          label: t("Poništi", "Undo"),
          onAction: () => {
            void bulkUpdate({ cardIds: ids, action: INVERSE[action] });
          },
        },
      });
      return result.changed;
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
      return 0;
    }
  };
}

function priceText(row: { priceKind: string; priceFrom?: number; priceBasis?: string; currency?: string }, language: "sr" | "en") {
  if (row.priceKind !== "from" || !row.priceFrom) return language === "en" ? "On request" : "Na upit";
  const basis = row.priceBasis ? pick(PRICE_BASIS[row.priceBasis] ?? PRICE_BASIS.unknown, language) : "";
  return `${language === "en" ? "from" : "od"} ${formatMoney(row.priceFrom, row.currency ?? "EUR")} ${basis}`.trim();
}

export default function OffersScreen() {
  const { t, language } = useAdminT();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const partners = useQuery(api.partners.adminList, {});
  const runBulk = useOfferBulk();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [kind, setKind] = useState<"" | "partner" | "ablux">((params.get("vrsta") as "" | "partner" | "ablux") ?? "");
  const [partnerSlug, setPartnerSlug] = useState(params.get("partner") ?? "");
  const [state, setState] = useState<StateFilter>((params.get("stanje") as StateFilter) ?? "");
  const [travelType, setTravelType] = useState(params.get("tip") ?? "");
  const [hasPrice, setHasPrice] = useState<"" | "yes" | "no">("");
  const [month, setMonth] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  const args = {
    q: debouncedQ || undefined,
    kind: kind || undefined,
    partnerSlug: partnerSlug || undefined,
    state: state || undefined,
    travelType: travelType || undefined,
    hasPrice: hasPrice === "" ? undefined : hasPrice === "yes",
    month: month || undefined,
  };
  const { results, status, loadMore } = usePaginatedQuery(api.offerAdmin.list, args, { initialNumItems: 60 });

  // A new filter starts with an empty selection.
  const filtersKey = JSON.stringify(args);
  const selected = selection.key === filtersKey ? selection.ids : new Set<string>();
  const setSelected = (update: Set<string> | ((current: Set<string>) => Set<string>)) =>
    setSelection((current) => {
      const base = current.key === filtersKey ? current.ids : new Set<string>();
      return { key: filtersKey, ids: typeof update === "function" ? update(base) : update };
    });

  const partnerName = useMemo(() => {
    const map = new Map<string, string>([["ablux", "ABLux"]]);
    for (const partner of partners ?? []) map.set(partner.slug, partner.name);
    return map;
  }, [partners]);

  const openId = params.get("ponuda");
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("ponuda", id);
    else next.delete("ponuda");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const selectedRows = results.filter((row) => selected.has(row._id));
  const allSelected = results.length > 0 && results.every((row) => selected.has(row._id));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = async (action: BulkAction) => {
    const changed = await runBulk(selectedRows.slice(0, 200), action);
    if (changed) setSelected(new Set());
  };

  const activeFilters = [kind, partnerSlug, state, travelType, hasPrice, month, debouncedQ].filter(Boolean).length;
  const resetFilters = () => {
    setQ("");
    setKind("");
    setPartnerSlug("");
    setState("");
    setTravelType("");
    setHasPrice("");
    setMonth("");
  };

  return (
    <div className="adm-page">
      <PageIntro>
        {t(
          "Sve ponude na jednom mestu: ABLux programi i ponude 17 partnera. Izaberite redove za grupnu objavu ili sakrivanje; otvorite ponudu da promenite naslov, uvod, kategoriju ili sliku. Vaše izmene ostaju i posle sledećeg uvoza.",
          "All offers in one place: ABLux programs and the offers of 17 partners. Select rows to publish or hide them together; open an offer to change its title, intro, category or image. Your changes stay after the next import."
        )}
      </PageIntro>

      <div className="adm-toolbar">
        <Field label={t("Pretraga", "Search")} className="adm-toolbar__search">
          <Input type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("Naziv ponude, mesto ili zemlja", "Offer name, place or country")} />
        </Field>
        <Button size="sm" variant="secondary" className="adm-filters-toggle" aria-expanded={filtersOpen} aria-controls="offer-filters" onClick={() => setFiltersOpen((value) => !value)} iconStart={<SlidersHorizontal aria-hidden="true" strokeWidth={1.5} />}>
          {activeFilters ? t(`Filteri (${activeFilters})`, `Filters (${activeFilters})`) : t("Filteri", "Filters")}
        </Button>
      </div>
      <div className="adm-toolbar adm-filters" id="offer-filters" data-open={filtersOpen ? "true" : "false"}>
        <Field label={t("Izvor", "Source")}>
          <Select value={kind} onChange={(event) => setKind(event.target.value as "" | "partner" | "ablux")}>
            <option value="">{t("ABLux i partneri", "ABLux and partners")}</option>
            <option value="ablux">{t("Samo ABLux programi", "ABLux programs only")}</option>
            <option value="partner">{t("Samo partneri", "Partners only")}</option>
          </Select>
        </Field>
        <Field label={t("Partner", "Partner")}>
          <Select value={partnerSlug} onChange={(event) => setPartnerSlug(event.target.value)} loading={partners === undefined}>
            <option value="">{t("Svi partneri", "All partners")}</option>
            {(partners ?? []).map((partner) => (
              <option key={partner.slug} value={partner.slug}>
                {partner.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Stanje", "State")}>
          <Select value={state} onChange={(event) => setState(event.target.value as StateFilter)}>
            <option value="">{t("Sva stanja", "All states")}</option>
            <option value="public">{t("Na sajtu", "On the site")}</option>
            <option value="unpublished">{t("Nije objavljena", "Not published")}</option>
            <option value="hidden">{t("Sakrivena", "Hidden")}</option>
            <option value="inactive">{t("Neaktivna (bez polazaka)", "Inactive (no departures)")}</option>
            <option value="removed">{t("Skinuta kod partnera", "Removed by partner")}</option>
          </Select>
        </Field>
        <Field label={t("Kategorija", "Category")}>
          <Select value={travelType} onChange={(event) => setTravelType(event.target.value)}>
            <option value="">{t("Sve kategorije", "All categories")}</option>
            {TRAVEL_TYPES.map((type) => (
              <option key={type.slug} value={type.slug}>
                {pick(type.label, language)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Cena", "Price")}>
          <Select value={hasPrice} onChange={(event) => setHasPrice(event.target.value as "" | "yes" | "no")}>
            <option value="">{t("Sa cenom i na upit", "Priced and on request")}</option>
            <option value="yes">{t("Ima cenu", "Has a price")}</option>
            <option value="no">{t("Cena na upit", "Price on request")}</option>
          </Select>
        </Field>
        <Field label={t("Mesec polaska", "Departure month")}>
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </Field>
        {activeFilters > 0 ? (
          <Button size="sm" variant="text" onClick={resetFilters}>
            {t("Poništi filtere", "Reset filters")}
          </Button>
        ) : null}
      </div>

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button size="sm" variant="secondary" onClick={() => bulk("publish")} iconStart={<Eye aria-hidden="true" strokeWidth={1.5} />}>
          {t("Objavi", "Publish")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => bulk("hide")} iconStart={<EyeOff aria-hidden="true" strokeWidth={1.5} />}>
          {t("Sakrij", "Hide")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => bulk("unhide")}>
          {t("Vrati na sajt", "Show again")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => bulk("feature")} iconStart={<Star aria-hidden="true" strokeWidth={1.5} />}>
          {t("Istakni", "Feature")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => bulk("unfeature")} iconStart={<StarOff aria-hidden="true" strokeWidth={1.5} />}>
          {t("Ukloni isticanje", "Unfeature")}
        </Button>
      </BulkBar>

      <Panel flush>
        {status === "LoadingFirstPage" ? (
          <SkeletonRows rows={10} />
        ) : results.length === 0 ? (
          <EmptyState
            title={activeFilters ? t("Nijedna ponuda ne odgovara filterima", "No offers match the filters") : t("Još nema ponuda", "No offers yet")}
            body={
              activeFilters
                ? status === "CanLoadMore"
                  ? t("Na ovoj strani nema pogodaka; učitajte još ponuda ili promenite filtere.", "No matches on this page; load more offers or change the filters.")
                  : t("Probajte manje filtera ili drugu reč u pretrazi.", "Try fewer filters or another search word.")
                : t("Ponude partnera stižu automatskim uvozom u 06:00; ABLux programe dodajete u Aranžmanima.", "Partner offers arrive with the automatic 06:00 import; ABLux programs are added under Packages.")
            }
            action={
              activeFilters ? (
                <div className="adm-row">
                  {status === "CanLoadMore" ? (
                    <Button size="sm" variant="secondary" onClick={() => loadMore(120)}>
                      {t("Učitaj još", "Load more")}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" onClick={resetFilters}>
                    {t("Poništi filtere", "Reset filters")}
                  </Button>
                </div>
              ) : (
                <ButtonLink size="sm" variant="secondary" href="/admin/partneri">
                  {t("Partneri i uvoz", "Partners and sync")}
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <div className="adm-table-wrap adm-only-wide">
              <table className="adm-table">
                <caption className="ui-sr-only">{t("Ponude", "Offers")}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="adm-table__check">
                      <label className="adm-check-hit">
                        <input
                          type="checkbox"
                          className="adm-check"
                          checked={allSelected}
                          aria-label={t("Izaberi sve prikazane", "Select all shown")}
                          onChange={() => setSelected(allSelected ? new Set() : new Set(results.slice(0, 200).map((row) => row._id)))}
                        />
                      </label>
                    </th>
                    <th scope="col">{t("Ponuda", "Offer")}</th>
                    <th scope="col">{t("Sledeći polazak", "Next departure")}</th>
                    <th scope="col" data-align="end">
                      {t("Cena", "Price")}
                    </th>
                    <th scope="col">{t("Stanje", "State")}</th>
                    <th scope="col">{t("Ažurirano", "Updated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => {
                    const light = offerState(row);
                    return (
                      <tr key={row._id} aria-selected={selected.has(row._id) || openId === row._id}>
                        <td className="adm-table__check">
                          <label className="adm-check-hit">
                            <input type="checkbox" className="adm-check" checked={selected.has(row._id)} onChange={() => toggle(row._id)} aria-label={t(`Izaberi: ${row.title}`, `Select: ${row.title}`)} />
                          </label>
                        </td>
                        <td>
                          <div className="adm-row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                            {row.coverPreview ? <Thumb src={row.coverPreview} /> : <span className="adm-thumb" aria-hidden="true" />}
                            <button type="button" className="adm-row-button" onClick={() => setOpen(row._id)}>
                              <span className="adm-row-title">
                                {row.featured ? <Star aria-label={t("Istaknuta", "Featured")} width={14} height={14} strokeWidth={2} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4, color: "var(--ablux-accent-text)" }} /> : null}
                                {row.title}
                              </span>
                              <span className="adm-row-meta">
                                {[row.kind === "ablux" ? "ABLux" : partnerName.get(row.partnerSlug) ?? row.partnerSlug, row.place, row.countryName].filter(Boolean).join(" · ")}
                                {row.hasOverrides ? ` · ${t("ABLux izmene", "ABLux edits")}` : ""}
                              </span>
                            </button>
                          </div>
                        </td>
                        <td className="adm-nowrap">
                          {row.nextDepartureDate ? formatDate(row.nextDepartureDate, language) : <span className="adm-muted">{t("na upit", "on request")}</span>}
                          {row.departureCount > 1 ? <span className="adm-row-meta">{t(`+${row.departureCount - 1} termina`, `+${row.departureCount - 1} dates`)}</span> : null}
                        </td>
                        <td data-align="end">
                          {row.priceKind === "from" && row.priceFrom ? (
                            <>
                              <span className="adm-strong adm-nowrap">
                                {t("od", "from")} {formatMoney(row.priceFrom, row.currency ?? "EUR")}
                              </span>
                              <span className="adm-row-meta">{pick(PRICE_BASIS[row.priceBasis ?? "unknown"] ?? PRICE_BASIS.unknown, language)}</span>
                            </>
                          ) : (
                            <span className="adm-muted">{t("Na upit", "On request")}</span>
                          )}
                        </td>
                        <td>
                          <StatusDot status={light.status} label={pick(light, language)} />
                        </td>
                        <td className="adm-nowrap adm-muted">{formatDate(row.updatedAt, language)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="adm-list adm-only-narrow">
              {results.map((row) => {
                const light = offerState(row);
                return (
                  <li key={row._id} className="adm-list__item">
                    <label className="adm-check-hit">
                      <input type="checkbox" className="adm-check" checked={selected.has(row._id)} onChange={() => toggle(row._id)} aria-label={t(`Izaberi: ${row.title}`, `Select: ${row.title}`)} />
                    </label>
                    <button type="button" className="adm-row-button" onClick={() => setOpen(row._id)}>
                      <span className="adm-row-title">{row.title}</span>
                      <span className="adm-row-meta">
                        {[row.kind === "ablux" ? "ABLux" : partnerName.get(row.partnerSlug) ?? row.partnerSlug, row.place].filter(Boolean).join(" · ")}
                      </span>
                      <span className="adm-row-meta">
                        {priceText(row, language)}
                        {row.nextDepartureDate ? ` · ${formatDate(row.nextDepartureDate, language)}` : ""}
                      </span>
                      <span style={{ display: "block", marginTop: "0.35rem" }}>
                        <StatusDot status={light.status} label={pick(light, language)} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {status === "CanLoadMore" || status === "LoadingMore" ? (
          <div className="adm-panel__foot">
            <span>{t(`Prikazano: ${results.length}`, `Shown: ${results.length}`)}</span>
            <Button size="sm" variant="secondary" onClick={() => loadMore(120)} loading={status === "LoadingMore"} loadingLabel={t("Učitavanje…", "Loading…")}>
              {t("Učitaj još", "Load more")}
            </Button>
          </div>
        ) : results.length > 0 ? (
          <div className="adm-panel__foot">
            <span>{t(`Ukupno prikazano: ${results.length}`, `Total shown: ${results.length}`)}</span>
          </div>
        ) : null}
      </Panel>

      <Sheet open={Boolean(openId)} onClose={() => setOpen(null)} title={t("Ponuda", "Offer")} wide>
        {openId ? <OfferDetail cardId={openId} partnerName={partnerName} /> : null}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- detail

function programEditorHref(externalId: string) {
  if (externalId.startsWith("verski:")) return "/admin/verski-turizam";
  return "/admin/aranzmani";
}

function OfferDetail({ cardId, partnerName }: { cardId: string; partnerName: Map<string, string> }) {
  const { t, language } = useAdminT();
  const data = useQuery(api.offerAdmin.get, { cardId });
  const runBulk = useOfferBulk();

  if (data === undefined) return <SkeletonRows rows={10} />;
  const { card, detail, changes } = data;
  const light = offerState(card);
  const flags: FlagRow = { _id: card._id, published: card.published, hidden: card.hidden, featured: card.featured };

  return (
    <>
      <header className="adm-stack" style={{ gap: "0.5rem" }}>
        <div className="adm-row" style={{ flexWrap: "nowrap", alignItems: "flex-start", gap: "0.85rem" }}>
          {card.coverPreview ? <Thumb src={card.coverPreview} width={96} height={72} /> : null}
          <div>
            <p className="adm-panel__title">{card.title}</p>
            <p className="adm-hint" style={{ margin: 0 }}>
              {[card.kind === "ablux" ? "ABLux program" : `${t("Organizator", "Organizer")}: ${card.organizerName}`, card.place, card.countryName].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="adm-row">
          <StatusDot status={light.status} label={pick(light, language)} chip />
          {card.kind === "partner" ? <Badge tone="outline">{partnerName.get(card.partnerSlug) ?? card.partnerSlug}</Badge> : <Badge tone="gold">ABLux</Badge>}
          <span className="adm-muted">{priceText(card, language)}</span>
        </div>
        <div className="adm-row">
          {card.isPublic ? (
            <a className="ui-btn ui-btn--secondary ui-btn--sm" href={`/ponude/${card.slug}`} target="_blank" rel="noopener">
              <span>{t("Otvori na sajtu", "Open on the site")}</span>
              <ExternalLink aria-hidden="true" strokeWidth={1.5} />
            </a>
          ) : null}
          {detail?.sourceUrl ? (
            <a className="ui-btn ui-btn--secondary ui-btn--sm" href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">
              <span>{t("Original kod partnera", "Partner's original")}</span>
              <ExternalLink aria-hidden="true" strokeWidth={1.5} />
            </a>
          ) : null}
          {card.kind === "ablux" ? (
            <ButtonLink size="sm" variant="secondary" href={programEditorHref(card.externalId)}>
              {t("Uredi program", "Edit program")}
            </ButtonLink>
          ) : null}
        </div>
      </header>

      <section>
        <p className="adm-section-title">{t("Prikaz na sajtu", "Visibility on the site")}</p>
        <div className="adm-row" style={{ gap: "0.25rem 1.5rem" }}>
          <Switch label={t("Objavljena", "Published")} checked={card.published} onChange={(next) => void runBulk([flags], next ? "publish" : "unpublish")} />
          <Switch label={t("Sakrivena", "Hidden")} checked={card.hidden} onChange={(next) => void runBulk([flags], next ? "hide" : "unhide")} />
          <Switch label={t("Istaknuta na početnoj", "Featured on the home page")} checked={card.featured} onChange={(next) => void runBulk([flags], next ? "feature" : "unfeature")} />
        </div>
        {!card.listed ? (
          <Notice>
            <p>{t("Partner je skinuo ovu ponudu sa svog sajta, pa se ne prikazuje posetiocima.", "The partner removed this offer from its site, so visitors do not see it.")}</p>
          </Notice>
        ) : !card.isActive ? (
          <Notice>
            <p>{t("Ponuda nema budući polazak, pa se ne prikazuje dok partner ne doda nove termine.", "The offer has no future departure, so it stays hidden until the partner adds new dates.")}</p>
          </Notice>
        ) : null}
      </section>

      {card.kind === "partner" ? (
        <OverridesForm
          key={`${card._id}-${card.updatedAt}`}
          cardId={card._id}
          imported={card.imported}
          overrides={card.overrides}
          coverPreview={card.coverPreview}
        />
      ) : (
        <Notice tone="info">
          <p>{t("Naslov, opis, cenu i slike ABLux programa menjate u uredniku programa; ovde birate samo prikaz.", "ABLux program title, text, price and images are edited in the program editor; here you only set visibility.")}</p>
        </Notice>
      )}

      <section>
        <p className="adm-section-title">{t("Poslednje promene iz uvoza", "Recent import changes")}</p>
        {changes.length === 0 ? (
          <p className="adm-hint">{t("Od prvog uvoza nije bilo promena.", "No changes since the first import.")}</p>
        ) : (
          <ul className="adm-list" style={{ border: "1px solid var(--ablux-line-soft)", borderRadius: 8 }}>
            {changes.map((change, index) => {
              const type = CHANGE_TYPE[change.type];
              return (
                <li key={index} className="adm-list__item adm-list__item--split">
                  <span>
                    <span className="adm-row-title">{pick(type, language)}</span>
                    <span className="adm-row-meta">{formatWhen(change.at, language)}</span>
                  </span>
                  {change.type === "price_up" || change.type === "price_down" ? (
                    <PriceChange oldPrice={change.oldPrice} newPrice={change.newPrice} />
                  ) : change.type === "dates" ? (
                    <span className="adm-muted adm-nowrap">
                      {formatDate(change.oldNextDeparture ?? "", language) || "–"} → {formatDate(change.newNextDeparture ?? "", language) || "–"}
                    </span>
                  ) : (
                    <span />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data.meta ? (
          <p className="adm-hint">
            {t("Poslednje čitanje kod partnera", "Last read from the partner")}: {formatWhen(data.meta.detailFetchedAt ?? data.meta.lastSeenAt, language)}
          </p>
        ) : null}
      </section>
    </>
  );
}

function OverridesForm({
  cardId,
  imported,
  overrides,
  coverPreview,
}: {
  cardId: string;
  imported: { title: string; travelTypes: string[]; coverUrl?: string };
  overrides: { title?: string; intro?: string; travelTypes?: string[]; coverUrl?: string; coverStorageId?: Id<"_storage"> };
  coverPreview: string | null;
}) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const setOverrides = useMutation(api.offerAdmin.setOverrides);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [title, setTitle] = useState(overrides.title ?? "");
  const [intro, setIntro] = useState(overrides.intro ?? "");
  const [types, setTypes] = useState<string[]>(overrides.travelTypes ?? []);
  const [coverUrl, setCoverUrl] = useState(overrides.coverUrl ?? "");
  const [coverStorageId, setCoverStorageId] = useState<Id<"_storage"> | undefined>(overrides.coverStorageId);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const toggleType = (slug: string) =>
    setTypes((current) => (current.includes(slug) ? current.filter((value) => value !== slug) : current.length >= 3 ? current : [...current, slug]));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      toast.show({ tone: "error", message: t("Izaberite JPG, PNG, WebP ili AVIF sliku do 5 MB.", "Choose a JPG, PNG, WebP or AVIF image up to 5 MB.") });
      return;
    }
    setUploading(true);
    try {
      const url = await generateUploadUrl({});
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      setCoverStorageId(storageId);
      setCoverUrl("");
      setLocalPreview(URL.createObjectURL(file));
    } catch {
      toast.show({ tone: "error", message: t("Slika nije otpremljena. Pokušajte ponovo.", "The image was not uploaded. Please try again.") });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    const previous = {
      title: overrides.title ?? null,
      intro: overrides.intro ?? null,
      travelTypes: overrides.travelTypes ?? null,
      coverUrl: overrides.coverUrl ?? null,
      coverStorageId: overrides.coverStorageId ?? null,
    };
    try {
      await setOverrides({
        cardId,
        title: title.trim() ? title.trim() : null,
        intro: intro.trim() ? intro.trim() : null,
        travelTypes: types.length ? types : null,
        coverUrl: coverUrl.trim() ? coverUrl.trim() : null,
        coverStorageId: coverUrl.trim() ? null : coverStorageId ?? null,
      });
      toast.show({
        message: t("Izmene su sačuvane i ostaju posle sledećeg uvoza.", "Changes saved; they stay after the next import."),
        action: { label: t("Poništi", "Undo"), onAction: () => void setOverrides({ cardId, ...previous }) },
      });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setBusy(false);
    }
  };

  const preview = localPreview ?? (coverUrl.startsWith("https://") ? coverUrl : coverPreview);
  const dirty =
    title !== (overrides.title ?? "") ||
    intro !== (overrides.intro ?? "") ||
    types.join() !== (overrides.travelTypes ?? []).join() ||
    coverUrl !== (overrides.coverUrl ?? "") ||
    coverStorageId !== overrides.coverStorageId;

  return (
    <section className="adm-stack">
      <div>
        <p className="adm-section-title">{t("ABLux izmene", "ABLux edits")}</p>
        <p className="adm-hint" style={{ margin: 0 }}>
          {t(
            "Prazno polje znači da se koristi tekst partnera. Ono što ovde upišete ima prednost i ne briše se pri uvozu.",
            "An empty field uses the partner's text. What you enter here wins and is not overwritten by imports."
          )}
        </p>
      </div>
      <Field label={t("Naslov na sajtu", "Title on the site")} hint={`${t("Kod partnera", "Partner's")}: ${imported.title}`}>
        <Input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder={imported.title} />
      </Field>
      <Field label={t("Uvod (kratak opis)", "Intro (short description)")} hint={t(`${intro.length}/600 znakova`, `${intro.length}/600 characters`)}>
        <Textarea rows={3} maxLength={600} value={intro} onChange={(event) => setIntro(event.target.value)} />
      </Field>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="ui-field__label" style={{ marginBottom: "0.4rem" }}>
          {t("Kategorija (najviše tri)", "Category (up to three)")}
        </legend>
        <div className="adm-row">
          {TRAVEL_TYPES.map((type) => (
            <Chip key={type.slug} selected={types.includes(type.slug)} onClick={() => toggleType(type.slug)} disabled={!types.includes(type.slug) && types.length >= 3}>
              {pick(type.label, language)}
            </Chip>
          ))}
        </div>
        <p className="adm-hint">
          {t("Iz uvoza", "From import")}: {imported.travelTypes.map((slug) => pick(TRAVEL_TYPES.find((type) => type.slug === slug)?.label ?? { sr: slug, en: slug }, language)).join(", ") || "–"}
        </p>
      </fieldset>
      <div className="adm-stack" style={{ gap: "0.5rem" }}>
        <span className="ui-field__label">{t("Naslovna slika", "Cover image")}</span>
        <div className="adm-row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          {preview ? <Thumb src={preview} width={120} height={90} /> : <span className="adm-thumb" style={{ width: 120, height: 90 }} aria-hidden="true" />}
          <div className="adm-stack" style={{ gap: "0.5rem", flex: 1 }}>
            <label className="ui-btn ui-btn--secondary ui-btn--sm" style={{ width: "fit-content" }}>
              <Upload aria-hidden="true" strokeWidth={1.5} />
              <span>{uploading ? t("Otpremanje…", "Uploading…") : t("Otpremi svoju sliku", "Upload your image")}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="ui-sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
            </label>
            <Field label={t("ili adresa slike (https)", "or image address (https)")}>
              <Input
                value={coverUrl}
                onChange={(event) => {
                  setCoverUrl(event.target.value);
                  setLocalPreview(null);
                }}
                placeholder="https://"
              />
            </Field>
            {coverStorageId || coverUrl ? (
              <Button
                size="sm"
                variant="text"
                onClick={() => {
                  setCoverUrl("");
                  setCoverStorageId(undefined);
                  setLocalPreview(null);
                }}
              >
                {t("Vrati sliku partnera", "Use the partner's image")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="adm-row">
        <Button size="sm" onClick={save} loading={busy} loadingLabel={t("Čuvamo…", "Saving…")} disabled={!dirty}>
          {t("Sačuvaj izmene", "Save changes")}
        </Button>
        {overrides.title || overrides.intro || overrides.travelTypes || overrides.coverUrl || overrides.coverStorageId ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setTitle("");
              setIntro("");
              setTypes([]);
              setCoverUrl("");
              setCoverStorageId(undefined);
              setLocalPreview(null);
            }}
          >
            {t("Vrati sve na tekst partnera", "Reset all to the partner's text")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
