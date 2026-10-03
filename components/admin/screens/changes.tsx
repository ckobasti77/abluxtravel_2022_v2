"use client";

// "Nove i izmenjene": what imports brought, newest first, grouped by day.
import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatDate, formatTime, formatWhen, startOfTodayBelgrade, useAdminT } from "../../../lib/admin/format";
import { CHANGE_TYPE, pick, PRICE_BASIS } from "../../../lib/admin/labels";
import { Button, EmptyState, Field, Select, StatusDot } from "../../ui";
import { PageIntro, Panel, PriceChange, Segment, SkeletonRows } from "../kit";

type ChangeType = "new" | "price_down" | "price_up" | "dates" | "removed" | "expired" | "returned";
type Period = "1" | "7" | "30" | "all";
const DAY = 86_400_000;

export default function ChangesScreen() {
  const { t, language } = useAdminT();
  const partners = useQuery(api.partners.adminList, {});
  const [partnerSlug, setPartnerSlug] = useState("");
  const [type, setType] = useState<"" | ChangeType>("");
  const [period, setPeriod] = useState<Period>("7");
  // Fixed per period choice (start of a Belgrade day), so the subscription stays stable.
  const since = useMemo(() => (period === "all" ? undefined : startOfTodayBelgrade() - (Number(period) - 1) * DAY), [period]);
  const { results, status, loadMore } = usePaginatedQuery(
    api.syncAdmin.listChanges,
    { partnerSlug: partnerSlug || undefined, type: type || undefined, since },
    { initialNumItems: 60 }
  );

  const partnerName = useMemo(() => new Map((partners ?? []).map((partner) => [partner.slug, partner.name])), [partners]);

  const groups = useMemo(() => {
    const out: { day: string; label: string; rows: typeof results }[] = [];
    for (const row of results) {
      const label = formatWhen(row.at, language).replace(/ (u|at) \d{2}:\d{2}$/, "");
      const day = formatDate(row.at, "sr");
      const last = out[out.length - 1];
      if (last && last.day === day) last.rows.push(row);
      else out.push({ day, label, rows: [row] });
    }
    return out;
  }, [results, language]);

  const types: ChangeType[] = ["new", "price_down", "price_up", "dates", "removed", "expired", "returned"];

  return (
    <div className="adm-page">
      <PageIntro>
        {t(
          "Sve što su uvozi promenili: nove ponude, promene cena (staro → novo), promenjeni termini, ponude koje je partner skinuo i one kojima su prošli polasci.",
          "Everything imports changed: new offers, price changes (old → new), changed dates, offers the partner removed and offers whose departures passed."
        )}
      </PageIntro>

      <div className="adm-toolbar">
        <Segment
          label={t("Period", "Period")}
          value={period}
          onChange={setPeriod}
          options={[
            { value: "1", label: t("Danas", "Today") },
            { value: "7", label: t("7 dana", "7 days") },
            { value: "30", label: t("30 dana", "30 days") },
            { value: "all", label: t("Sve", "All") },
          ]}
        />
      </div>
      <div className="adm-toolbar">
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
        <Field label={t("Vrsta promene", "Change type")}>
          <Select value={type} onChange={(event) => setType(event.target.value as "" | ChangeType)}>
            <option value="">{t("Sve promene", "All changes")}</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {pick(CHANGE_TYPE[value], language)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {status === "LoadingFirstPage" ? (
        <Panel flush>
          <SkeletonRows rows={10} />
        </Panel>
      ) : results.length === 0 ? (
        <Panel flush>
          <EmptyState
            title={t("U ovom periodu nema promena", "No changes in this period")}
            body={
              status === "CanLoadMore"
                ? t("Na ovoj strani nema pogodaka; učitajte još.", "No matches on this page; load more.")
                : t("Izaberite duži period ili drugog partnera. Novi uvoz stiže automatski u 06:00.", "Choose a longer period or another partner. The next import runs automatically at 06:00.")
            }
            action={
              status === "CanLoadMore" ? (
                <Button size="sm" variant="secondary" onClick={() => loadMore(120)}>
                  {t("Učitaj još", "Load more")}
                </Button>
              ) : period !== "all" ? (
                <Button size="sm" variant="secondary" onClick={() => setPeriod("all")}>
                  {t("Prikaži sve", "Show all")}
                </Button>
              ) : undefined
            }
            glyph="pin"
          />
        </Panel>
      ) : (
        groups.map((group) => (
          <Panel key={group.day} title={group.label} sub={t(`Promena: ${group.rows.length}`, `Changes: ${group.rows.length}`)} flush headingLevel="h2">
            <ul className="adm-list">
              {group.rows.map((row) => {
                const kind = CHANGE_TYPE[row.type];
                return (
                  <li key={row._id}>
                    <Link href={`/admin/ponude?ponuda=${row.cardId}`} className="adm-list__item adm-list__item--plain adm-list__link adm-change">
                      <span className="adm-change__time tabular">{formatTime(row.at)}</span>
                      <span className="adm-change__type">
                        <StatusDot status={kind.status} label={pick(kind, language)} />
                      </span>
                      <span className="adm-change__title">
                        <span className="adm-row-title">{row.title}</span>
                        <span className="adm-row-meta">{partnerName.get(row.partnerSlug) ?? row.partnerSlug}</span>
                      </span>
                      <span className="adm-change__detail">
                        {row.type === "price_up" || row.type === "price_down" ? (
                          <>
                            <PriceChange oldPrice={row.oldPrice} newPrice={row.newPrice} />
                            {row.basis ? <span className="adm-row-meta">{pick(PRICE_BASIS[row.basis] ?? PRICE_BASIS.unknown, language)}</span> : null}
                          </>
                        ) : row.type === "dates" ? (
                          <span className="adm-muted adm-nowrap">
                            {t("Sledeći polazak", "Next departure")}: {formatDate(row.oldNextDeparture ?? "", language) || "–"} → {formatDate(row.newNextDeparture ?? "", language) || "–"}
                          </span>
                        ) : row.type === "new" && row.newPrice ? (
                          <span className="adm-muted adm-nowrap">
                            <PriceChange newPrice={row.newPrice} />
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))
      )}

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="adm-row">
          <Button size="sm" variant="secondary" onClick={() => loadMore(120)} loading={status === "LoadingMore"} loadingLabel={t("Učitavanje…", "Loading…")}>
            {t("Učitaj starije", "Load older")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
