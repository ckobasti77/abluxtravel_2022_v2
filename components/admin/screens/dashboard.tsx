"use client";

import { useQuery } from "convex/react";
import { FileUp, Inbox, Play, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { formatCount, formatDuration, formatMoney, formatTime, formatWhen, startOfTodayBelgrade, useAdminT } from "../../../lib/admin/format";
import { CHANGE_TYPE, INBOX_STATUS, partnerLight, pick, RUN_STATUS, TRIGGER_LABEL } from "../../../lib/admin/labels";
import { ButtonLink, EmptyState, StatusDot } from "../../ui";
import { Notice, PageIntro, Panel, PriceChange, SkeletonRows, Stat, useNow } from "../kit";
import { serbianPlural } from "@/lib/catalog/format";

const DAY = 86_400_000;

export default function DashboardScreen() {
  const { t, language } = useAdminT();
  const now = useNow(30_000);
  const inbox = useQuery(api.inbox.list, {});
  const overview = useQuery(api.syncAdmin.overview, {});
  const status = useQuery(api.syncAdmin.getSyncStatus, {});
  const partners = useQuery(api.partners.adminList, {});
  // Fixed "since" per mount, so the paginated query keeps one subscription.
  const changes = useQuery(api.syncAdmin.listChanges, { since: Math.floor((now - DAY) / 3_600_000) * 3_600_000, paginationOpts: { numItems: 8, cursor: null } });

  const todayStart = startOfTodayBelgrade(now);
  const today = inbox?.rows.filter((row) => row.createdAt >= todayStart) ?? [];
  const openRows = inbox?.rows.filter((row) => row.status === "new" || row.status === "in_progress").slice(0, 6) ?? [];
  const changedSinceYesterday = overview ? overview.last24h.new + overview.last24h.priceDown + overview.last24h.priceUp + overview.last24h.removed : null;
  const nextRun = status?.nextAutoRunAt ?? overview?.nextAutoRunAt;
  const partnerRows = partners?.filter((partner) => partner.status !== "manual") ?? [];
  const problems = partnerRows.filter((partner) => partner.isEnabled && partner.status === "active" && partner.lastRun && !["ok", "partial"].includes(partner.lastRun.status ?? ""));

  return (
    <div className="adm-page">
      <PageIntro
        actions={
          <>
            <ButtonLink href="/admin/upiti" size="sm" variant="secondary" iconStart={<Inbox aria-hidden="true" strokeWidth={1.5} />}>
              {t("Svi upiti", "All inquiries")}
            </ButtonLink>
            <ButtonLink href="/admin/ponude" size="sm" variant="secondary">
              {t("Sve ponude", "All offers")}
            </ButtonLink>
          </>
        }
      >
        {t("Šta je stiglo danas, kako je prošao uvoz ponuda i šta se promenilo od juče.", "What arrived today, how the offer import went and what changed since yesterday.")}
      </PageIntro>

      <div className="adm-stats">
        <Stat
          label={t("Novi upiti i rezervacije", "New inquiries and bookings")}
          value={inbox ? formatCount(inbox.counts.new) : "–"}
          meta={inbox ? t(`Danas stiglo: ${today.length}`, `Arrived today: ${today.length}`) : t("Učitavanje…", "Loading…")}
          href="/admin/upiti?status=new"
        />
        <Stat
          label={t("Ponude na sajtu", "Offers on the site")}
          value={overview ? formatCount(overview.offers.public) : "–"}
          meta={t("ponude partnera koje posetioci vide", "partner offers visitors can see")}
          href="/admin/ponude?stanje=public"
        />
        <Stat
          label={t("Izmene od juče", "Changes since yesterday")}
          value={changedSinceYesterday === null ? "–" : formatCount(changedSinceYesterday)}
          meta={
            overview
              ? t(
                  `${overview.last24h.new} ${serbianPlural(overview.last24h.new, "nova", "nove", "novih")} · ${overview.last24h.priceDown + overview.last24h.priceUp} ${serbianPlural(overview.last24h.priceDown + overview.last24h.priceUp, "cena", "cene", "cena")} · ${overview.last24h.removed} ${serbianPlural(overview.last24h.removed, "skinuta", "skinute", "skinutih")}`,
                  `${overview.last24h.new} new · ${overview.last24h.priceDown + overview.last24h.priceUp} prices · ${overview.last24h.removed} removed`
                )
              : undefined
          }
          href="/admin/izmene"
        />
        <Stat
          label={t("Sledeći automatski uvoz", "Next automatic import")}
          value={nextRun ? formatTime(nextRun) : "–"}
          meta={nextRun ? `${formatWhen(nextRun, language, now)} · ${t("za", "in")} ${formatDuration(nextRun - now, language)}` : undefined}
          href="/admin/partneri"
        />
      </div>

      {status && !status.cronEnabled ? (
        <Notice>
          <p>
            {t(
              "Automatski uvoz u 06:00 je isključen. Ponude partnera se osvežavaju samo kada ga neko pokrene ručno.",
              "The automatic 06:00 import is switched off. Partner offers refresh only when someone runs it manually."
            )}
          </p>
        </Notice>
      ) : null}

      <div className="adm-grid adm-grid--main-side">
        <div className="adm-stack">
          <Panel
            id="dash-inbox"
            title={t("Upiti koji čekaju", "Requests waiting")}
            sub={t("Novi i oni u obradi, najnoviji prvi.", "New and in progress, newest first.")}
            actions={
              <Link href="/admin/upiti" className="adm-link">
                {t("Otvori sve", "Open all")}
              </Link>
            }
            flush
          >
            {inbox === undefined ? (
              <SkeletonRows rows={4} />
            ) : openRows.length === 0 ? (
              <EmptyState
                title={t("Nema upita koji čekaju", "No requests waiting")}
                body={t(
                  "Novi upiti sa sajta i porudžbine sa IPS uplatom pojaviće se ovde. Obaveštenje e-poštom stiže kada se podesi slanje pošte.",
                  "New website inquiries and IPS orders will appear here. E-mail notifications arrive once sending is set up."
                )}
                glyph="compass"
              />
            ) : (
              <ul className="adm-list">
                {openRows.map((row) => {
                  const state = INBOX_STATUS[row.status];
                  return (
                    <li key={`${row.kind}-${row.id}`}>
                      <Link href={`/admin/upiti?${row.kind === "order" ? "porudzbina" : "upit"}=${row.id}`} className="adm-list__item adm-list__item--plain adm-list__link">
                        <span className="adm-row adm-row--between">
                          <span className="adm-row-title">{row.name || t("Bez imena", "No name")}</span>
                          <StatusDot status={state.status} label={pick(state, language)} chip />
                        </span>
                        <span className="adm-row-meta">
                          {row.kind === "order" ? t("Porudžbina", "Order") : t("Upit", "Inquiry")} · {row.title}
                          {row.amount ? ` · ${formatMoney(row.amount, row.currency ?? "RSD")}` : ""}
                        </span>
                        <span className="adm-row-meta">{formatWhen(row.createdAt, language, now)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            id="dash-changes"
            title={t("Nove i izmenjene ponude (24 h)", "New and changed offers (24 h)")}
            actions={
              <Link href="/admin/izmene" className="adm-link">
                {t("Sve izmene", "All changes")}
              </Link>
            }
            flush
          >
            {changes === undefined ? (
              <SkeletonRows rows={4} />
            ) : changes.page.length === 0 ? (
              <EmptyState
                title={t("Od juče nema izmena", "No changes since yesterday")}
                body={t("Posle sledećeg uvoza ovde će biti nove ponude, promene cena i skinute ponude.", "After the next import, new offers, price changes and removals will show here.")}
                glyph="pin"
              />
            ) : (
              <ul className="adm-list">
                {changes.page.map((change) => {
                  const type = CHANGE_TYPE[change.type];
                  return (
                    <li key={change._id}>
                      <Link href={`/admin/ponude?ponuda=${change.cardId}`} className="adm-list__item adm-list__item--plain adm-list__link">
                        <span className="adm-row adm-row--between">
                          <span className="adm-row-title">{change.title}</span>
                          <StatusDot status={type.status} label={pick(type, language)} />
                        </span>
                        <span className="adm-row-meta">
                          {partners?.find((partner) => partner.slug === change.partnerSlug)?.name ?? change.partnerSlug} · {formatWhen(change.at, language, now)}
                        </span>
                        {change.type === "price_up" || change.type === "price_down" ? <PriceChange oldPrice={change.oldPrice} newPrice={change.newPrice} /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="adm-stack">
          <Panel
            id="dash-sync"
            title={t("Stanje uvoza po partneru", "Import status per partner")}
            sub={
              status?.activeRun
                ? t("Uvoz je upravo u toku.", "An import is running right now.")
                : status?.lastRun
                  ? `${t("Poslednji uvoz", "Last import")}: ${formatWhen(status.lastRun.startedAt, language, now)} · ${pick(TRIGGER_LABEL[status.lastRun.trigger] ?? TRIGGER_LABEL.cli, language)} · ${pick(RUN_STATUS[status.lastRun.status] ?? RUN_STATUS.ok, language)}`
                  : undefined
            }
            actions={
              <Link href="/admin/partneri" className="adm-link">
                {t("Detalji", "Details")}
              </Link>
            }
            flush
          >
            {partners === undefined ? (
              <SkeletonRows rows={8} />
            ) : (
              <ul className="adm-list">
                {partnerRows.map((partner) => {
                  const light = partnerLight(partner);
                  return (
                    <li key={partner.slug}>
                      <Link href={`/admin/partneri?partner=${partner.slug}`} className="adm-list__item adm-list__item--split adm-list__link">
                        <span>
                          <span className="adm-row-title">{partner.name}</span>
                          <span className="adm-row-meta">{t(`${partner.counts.active} ${serbianPlural(partner.counts.active, "aktivna", "aktivne", "aktivnih")}`, `${partner.counts.active} active`)}</span>
                        </span>
                        <StatusDot status={light.status} label={pick(light, language)} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {problems.length > 0 ? (
            <Notice tone="error">
              <p>
                {t(
                  `Poslednji uvoz nije uspeo za: ${problems.map((partner) => partner.name).join(", ")}. Razlog je na kartici partnera.`,
                  `The last import failed for: ${problems.map((partner) => partner.name).join(", ")}. The reason is on the partner card.`
                )}
              </p>
            </Notice>
          ) : null}

          <Panel id="dash-actions" title={t("Brze radnje", "Quick actions")}>
            <div className="adm-stack adm-stack--tight">
              <ButtonLink href="/admin/partneri?pokreni=1" variant="secondary" size="sm" block iconStart={<Play aria-hidden="true" strokeWidth={1.5} />}>
                {t("Pokreni uvoz ponuda", "Run the offer import")}
              </ButtonLink>
              <ButtonLink href="/admin/partneri/rucni-unos?novo=1" variant="secondary" size="sm" block iconStart={<FileUp aria-hidden="true" strokeWidth={1.5} />}>
                {t("Unesi ponudu iz cenovnika", "Enter an offer from a price list")}
              </ButtonLink>
              <ButtonLink href="/admin/aranzmani" variant="secondary" size="sm" block iconStart={<Plus aria-hidden="true" strokeWidth={1.5} />}>
                {t("Novi ABLux aranžman", "New ABLux package")}
              </ButtonLink>
              <ButtonLink href="/admin/podesavanja" variant="secondary" size="sm" block iconStart={<Settings aria-hidden="true" strokeWidth={1.5} />}>
                {t("Kontakt podaci na sajtu", "Contact details on the site")}
              </ButtonLink>
              <p className="adm-hint">
                {t("Savet: pritisnite Ctrl + K bilo gde u administraciji da pronađete ponudu ili ekran.", "Tip: press Ctrl + K anywhere in the admin to find an offer or screen.")}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
