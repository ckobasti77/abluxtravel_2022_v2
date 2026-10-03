"use client";

// "Upiti i rezervacije": inquiries from the site and IPS orders in one inbox.
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Mail, Phone } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { errorCode, formatDate, formatMoney, formatWhen, useAdminT } from "../../../lib/admin/format";
import { errorMessage, INBOX_STATUS, PAYMENT_STATUS, pick, PRICE_BASIS } from "../../../lib/admin/labels";
import { Badge, Button, EmptyState, Field, Input, Select, StatusDot, Textarea, useToast } from "../../ui";
import { Notice, PageIntro, Panel, Segment, Sheet, SkeletonRows, useNow } from "../kit";

type InboxStatus = "new" | "in_progress" | "confirmed" | "cancelled";
type Kind = "inquiry" | "order";
const STATUSES: InboxStatus[] = ["new", "in_progress", "confirmed", "cancelled"];

/** Inbox status → order status (an order keeps "paid" when it was paid before). */
function orderStatusFor(status: InboxStatus): "pending" | "in_progress" | "confirmed" | "cancelled" {
  return status === "new" ? "pending" : status;
}

export default function InboxScreen() {
  const { t, language } = useAdminT();
  const now = useNow(60_000);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const statusParam = params.get("status");
  const status = (STATUSES as string[]).includes(statusParam ?? "") ? (statusParam as InboxStatus) : "all";
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [q, setQ] = useState("");
  const data = useQuery(api.inbox.list, { status: status === "all" ? undefined : status, kind: kind === "all" ? undefined : kind, q: q.trim() || undefined });

  const openId = params.get("upit") ?? params.get("porudzbina");
  const openKind: Kind = params.get("porudzbina") ? "order" : "inquiry";

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const open = (row: { kind: Kind; id: string }) => setParams({ upit: row.kind === "inquiry" ? row.id : null, porudzbina: row.kind === "order" ? row.id : null });
  const close = () => setParams({ upit: null, porudzbina: null });

  const counts = data?.counts;
  const segment = [
    { value: "all", label: t("Sve", "All"), count: counts?.all },
    ...STATUSES.map((value) => ({ value, label: pick(INBOX_STATUS[value], language), count: counts?.[value] })),
  ];

  return (
    <div className="adm-page">
      <PageIntro>
        {t(
          "Upiti sa stranica ponuda i kontakt forme, i porudžbine ABLux programa sa IPS uplatom. Otvorite red da promenite status, zadužite kolegu ili dodate belešku.",
          "Inquiries from offer pages and the contact form, and ABLux orders paid by IPS. Open a row to change its status, assign a colleague or add a note."
        )}
      </PageIntro>

      <div className="adm-toolbar">
        <Segment label={t("Status", "Status")} options={segment as { value: string; label: string; count?: number }[]} value={status} onChange={(value) => setParams({ status: value === "all" ? null : value })} />
      </div>
      <div className="adm-toolbar">
        <Field label={t("Pretraga", "Search")} className="adm-toolbar__search">
          <Input type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("Ime, telefon, e-adresa ili ponuda", "Name, phone, e-mail or offer")} />
        </Field>
        <Field label={t("Vrsta", "Type")}>
          <Select value={kind} onChange={(event) => setKind(event.target.value as "all" | Kind)}>
            <option value="all">{t("Upiti i porudžbine", "Inquiries and orders")}</option>
            <option value="inquiry">{t("Samo upiti", "Inquiries only")}</option>
            <option value="order">{t("Samo porudžbine (IPS)", "Orders only (IPS)")}</option>
          </Select>
        </Field>
      </div>

      <Panel flush>
        {data === undefined ? (
          <SkeletonRows rows={8} />
        ) : data.rows.length === 0 ? (
          <EmptyState
            title={q || status !== "all" || kind !== "all" ? t("Nema stavki za ovaj izbor", "Nothing matches this selection") : t("Još nema upita", "No inquiries yet")}
            body={
              q || status !== "all" || kind !== "all"
                ? t("Probajte drugi status ili obrišite pretragu.", "Try another status or clear the search.")
                : t(
                    "Novi upiti sa sajta pojaviće se ovde, a obaveštenje stiže na Vaš e-mail kada se podesi slanje pošte.",
                    "New website inquiries will appear here; e-mail notifications arrive once sending is set up."
                  )
            }
            action={
              q || status !== "all" || kind !== "all" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setKind("all");
                    setParams({ status: null });
                  }}
                >
                  {t("Prikaži sve", "Show all")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="adm-table-wrap adm-only-wide">
              <table className="adm-table">
                <caption className="ui-sr-only">{t("Upiti i rezervacije", "Inquiries and bookings")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("Primljeno", "Received")}</th>
                    <th scope="col">{t("Klijent", "Client")}</th>
                    <th scope="col">{t("Šta traži", "Request")}</th>
                    <th scope="col" data-align="end">
                      {t("Putnika / iznos", "Travelers / amount")}
                    </th>
                    <th scope="col">{t("Status", "Status")}</th>
                    <th scope="col">{t("Zadužen", "Assignee")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    const state = INBOX_STATUS[row.status];
                    const selected = openId === row.id;
                    return (
                      <tr key={`${row.kind}-${row.id}`} aria-selected={selected}>
                        <td className="adm-nowrap">{formatWhen(row.createdAt, language, now)}</td>
                        <td>
                          <button type="button" className="adm-row-button" onClick={() => open(row)}>
                            <span className="adm-row-title">{row.name || t("Bez imena", "No name")}</span>
                            <span className="adm-row-meta">{row.phone || row.email}</span>
                          </button>
                        </td>
                        <td>
                          <span className="adm-row">
                            <Badge tone={row.kind === "order" ? "neutral" : "outline"}>{row.kind === "order" ? t("Porudžbina", "Order") : t("Upit", "Inquiry")}</Badge>
                            <span>{row.title}</span>
                          </span>
                          {row.organizer ? <span className="adm-row-meta">{t("Organizator", "Organizer")}: {row.organizer}</span> : null}
                        </td>
                        <td data-align="end">
                          {row.kind === "order" ? (
                            <>
                              <span className="adm-strong">{formatMoney(row.amount, row.currency ?? "RSD")}</span>
                              {row.paymentStatus ? <span className="adm-row-meta">{pick(PAYMENT_STATUS[row.paymentStatus], language)}</span> : null}
                            </>
                          ) : (
                            row.travelers ?? "–"
                          )}
                        </td>
                        <td>
                          <StatusDot status={state.status} label={pick(state, language)} chip />
                        </td>
                        <td>{row.assigneeName ?? <span className="adm-muted">{t("Niko", "Nobody")}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="adm-list adm-only-narrow">
              {data.rows.map((row) => {
                const state = INBOX_STATUS[row.status];
                return (
                  <li key={`${row.kind}-${row.id}`}>
                    <button type="button" className="adm-row-button adm-list__item adm-list__item--plain adm-list__link" onClick={() => open(row)}>
                      <span className="adm-row adm-row--between">
                        <span className="adm-row-title">{row.name || t("Bez imena", "No name")}</span>
                        <StatusDot status={state.status} label={pick(state, language)} chip />
                      </span>
                      <span className="adm-row-meta">
                        {row.kind === "order" ? t("Porudžbina", "Order") : t("Upit", "Inquiry")} · {row.title}
                      </span>
                      <span className="adm-row-meta">
                        {formatWhen(row.createdAt, language, now)}
                        {row.kind === "order" ? ` · ${formatMoney(row.amount, row.currency ?? "RSD")}` : ""}
                        {row.assigneeName ? ` · ${row.assigneeName}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {data?.truncated ? (
          <p className="adm-hint" style={{ padding: "0 1rem 1rem" }}>
            {t("Prikazano je najnovijih 300 upita i 300 porudžbina.", "Showing the newest 300 inquiries and 300 orders.")}
          </p>
        ) : null}
      </Panel>

      <Sheet
        open={Boolean(openId)}
        onClose={close}
        title={openKind === "order" ? t("Porudžbina", "Order") : t("Upit", "Inquiry")}
        wide
      >
        {openId ? openKind === "order" ? <OrderDetail id={openId} /> : <InquiryDetail id={openId} /> : null}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- shared detail parts

function useStaff() {
  return useQuery(api.users.staffList, {});
}

function WorkControls({
  kind,
  id,
  status,
  assigneeId,
}: {
  kind: Kind;
  id: string;
  status: InboxStatus;
  assigneeId: string | null;
}) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const staff = useStaff();
  const updateInquiry = useMutation(api.inquiries.update);
  const updateOrder = useMutation(api.orders.update);

  const save = async (patch: { status?: InboxStatus; assigneeId?: string | null }, undo?: { status?: InboxStatus; assigneeId?: string | null }) => {
    try {
      if (kind === "inquiry") await updateInquiry({ id, ...patch });
      else await updateOrder({ id, assigneeId: patch.assigneeId, status: patch.status ? orderStatusFor(patch.status) : undefined });
      toast.show({
        message: patch.status ? t(`Status: ${pick(INBOX_STATUS[patch.status], "sr")}`, `Status: ${INBOX_STATUS[patch.status].en}`) : t("Zaduženje je sačuvano.", "Assignee saved."),
        action: undo
          ? {
              label: t("Poništi", "Undo"),
              onAction: () => {
                void (kind === "inquiry"
                  ? updateInquiry({ id, ...undo })
                  : updateOrder({ id, assigneeId: undo.assigneeId, status: undo.status ? orderStatusFor(undo.status) : undefined }));
              },
            }
          : undefined,
      });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  return (
    <div className="adm-stack">
      <div>
        <p className="adm-section-title">{t("Status", "Status")}</p>
        <Segment
          label={t("Status zahteva", "Request status")}
          options={STATUSES.map((value) => ({ value, label: pick(INBOX_STATUS[value], language) }))}
          value={status}
          onChange={(value) => {
            if (value !== status) void save({ status: value }, { status });
          }}
        />
      </div>
      <Field label={t("Zadužen", "Assignee")} hint={t("Ko iz agencije vodi ovaj zahtev.", "Who in the agency handles this request.")}>
        <Select
          value={assigneeId ?? ""}
          loading={staff === undefined}
          onChange={(event) => {
            const next = event.target.value || null;
            void save({ assigneeId: next }, { assigneeId });
          }}
        >
          <option value="">{t("Niko", "Nobody")}</option>
          {(staff ?? []).map((person) => (
            <option key={person._id} value={person._id}>
              {person.displayName}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

function Notes({ kind, id, notes }: { kind: Kind; id: string; notes: { at: number; byName: string; text: string }[] }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const updateInquiry = useMutation(api.inquiries.update);
  const updateOrder = useMutation(api.orders.update);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      if (kind === "inquiry") await updateInquiry({ id, note: text });
      else await updateOrder({ id, note: text });
      setText("");
      toast.show({ message: t("Beleška je dodata.", "Note added.") });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <p className="adm-section-title">{t("Beleške agencije", "Agency notes")}</p>
      {notes.length === 0 ? (
        <p className="adm-hint">{t("Još nema beleški. Zapišite šta ste dogovorili sa klijentom; vide ih samo zaposleni.", "No notes yet. Write down what you agreed with the client; only staff can see them.")}</p>
      ) : (
        <ul className="adm-notes">
          {notes.map((note, index) => (
            <li key={index} className="adm-note">
              <p className="adm-note__meta">
                {note.byName} · {formatWhen(note.at, language)}
              </p>
              <p className="adm-note__text">{note.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="adm-stack" style={{ marginTop: "0.75rem" }}>
        <Field label={t("Nova beleška", "New note")}>
          <Textarea rows={3} value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} placeholder={t("Npr. Pozvala klijentkinju, šalje dokumenta do petka.", "E.g. Called the client, documents by Friday.")} />
        </Field>
        <div>
          <Button size="sm" variant="secondary" onClick={add} loading={busy} loadingLabel={t("Čuvamo…", "Saving…")} disabled={!text.trim()}>
            {t("Dodaj belešku", "Add note")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ContactList({ phone, email }: { phone?: string; email?: string }) {
  const { t } = useAdminT();
  return (
    <div className="adm-row">
      {phone ? (
        <a className="ui-btn ui-btn--secondary ui-btn--sm" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
          <Phone aria-hidden="true" strokeWidth={1.5} />
          <span>{phone}</span>
        </a>
      ) : null}
      {email ? (
        <a className="ui-btn ui-btn--secondary ui-btn--sm" href={`mailto:${email}`}>
          <Mail aria-hidden="true" strokeWidth={1.5} />
          <span>{email}</span>
        </a>
      ) : null}
      {!phone && !email ? <span className="adm-muted">{t("Kontakt nije ostavljen.", "No contact given.")}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------- inquiry

function InquiryDetail({ id }: { id: string }) {
  const { t, language } = useAdminT();
  const row = useQuery(api.inquiries.get, { id });
  if (row === undefined) return <SkeletonRows rows={8} />;

  return (
    <>
      <header className="adm-stack" style={{ gap: "0.35rem" }}>
        <p className="adm-panel__title">{row.fullName}</p>
        <p className="adm-hint" style={{ margin: 0 }}>
          {t("Primljeno", "Received")} {formatWhen(row.createdAt, language)} · {row.locale === "en" ? t("sajt na engleskom", "English site") : t("sajt na srpskom", "Serbian site")}
        </p>
        <ContactList phone={row.phone} email={row.email} />
      </header>

      <WorkControls kind="inquiry" id={row._id} status={row.status} assigneeId={row.assigneeId ?? null} />

      <section>
        <p className="adm-section-title">{t("Zahtev", "Request")}</p>
        <dl className="adm-dl">
          <dt>{t("Tema", "Topic")}</dt>
          <dd>{row.offer?.title ?? row.subject ?? t("Opšti upit", "General inquiry")}</dd>
          {row.offer ? (
            <>
              <dt>{t("Organizator", "Organizer")}</dt>
              <dd>{row.offer.organizerName}</dd>
              {row.offer.priceFrom ? (
                <>
                  <dt>{t("Cena u trenutku upita", "Price at inquiry")}</dt>
                  <dd>
                    {t("od", "from")} {formatMoney(row.offer.priceFrom)} {row.offer.priceBasis ? pick(PRICE_BASIS[row.offer.priceBasis] ?? PRICE_BASIS.unknown, language) : ""}
                  </dd>
                </>
              ) : null}
            </>
          ) : null}
          <dt>{t("Putnika", "Travelers")}</dt>
          <dd>{row.travelers ?? "–"}</dd>
          <dt>{t("Željeni polazak", "Preferred departure")}</dt>
          <dd>{row.preferredDeparture || "–"}</dd>
          <dt>{t("Saglasnost", "Consent")}</dt>
          <dd>{formatDate(row.consentAt, language)}</dd>
        </dl>
        {row.offer ? (
          <div className="adm-row" style={{ marginTop: "0.75rem" }}>
            <a className="ui-btn ui-btn--secondary ui-btn--sm" href={`/ponude/${row.offer.slug}`} target="_blank" rel="noopener">
              <span>{t("Ponuda na sajtu", "Offer on the site")}</span>
              <ExternalLink aria-hidden="true" strokeWidth={1.5} />
            </a>
            {row.offer.sourceUrl ? (
              <a className="ui-btn ui-btn--secondary ui-btn--sm" href={row.offer.sourceUrl} target="_blank" rel="noopener noreferrer">
                <span>{t("Program kod organizatora", "Organizer's program")}</span>
                <ExternalLink aria-hidden="true" strokeWidth={1.5} />
              </a>
            ) : null}
          </div>
        ) : null}
      </section>

      <section>
        <p className="adm-section-title">{t("Poruka klijenta", "Client message")}</p>
        {row.message ? <p className="adm-note__text">{row.message}</p> : <p className="adm-hint">{t("Klijent nije napisao poruku.", "The client did not write a message.")}</p>}
      </section>

      <Notes kind="inquiry" id={row._id} notes={row.notes} />
    </>
  );
}

// ---------------------------------------------------------------- order

function OrderDetail({ id }: { id: string }) {
  const { t, language } = useAdminT();
  const toast = useToast();
  const order = useQuery(api.orders.get, { id });
  const updateOrder = useMutation(api.orders.update);
  if (order === undefined) return <SkeletonRows rows={8} />;

  const inboxStatus: InboxStatus = order.status === "pending" ? "new" : order.status === "paid" ? "confirmed" : order.status;
  const payment = order.paymentStatus ?? "awaiting_payment";

  const setPayment = async (next: "awaiting_payment" | "paid" | "failed") => {
    try {
      await updateOrder({ id: order._id, paymentStatus: next });
      toast.show({
        message: t(`Uplata: ${PAYMENT_STATUS[next].sr}`, `Payment: ${PAYMENT_STATUS[next].en}`),
        action: { label: t("Poništi", "Undo"), onAction: () => void updateOrder({ id: order._id, paymentStatus: payment }) },
      });
    } catch (error) {
      toast.show({ tone: "error", message: errorMessage(errorCode(error), language) });
    }
  };

  return (
    <>
      <header className="adm-stack" style={{ gap: "0.35rem" }}>
        <p className="adm-panel__title">{order.customerName || t("Kupac", "Customer")}</p>
        <p className="adm-hint" style={{ margin: 0 }}>
          {t("Poručeno", "Ordered")} {formatWhen(order.createdAt, language)} · {t("IPS QR uplata", "IPS QR payment")}
        </p>
        <ContactList phone={order.customerPhone} email={order.customerEmail} />
      </header>

      <WorkControls kind="order" id={order._id} status={inboxStatus} assigneeId={order.assigneeId ?? null} />

      <section>
        <p className="adm-section-title">{t("Uplata (IPS)", "Payment (IPS)")}</p>
        <Notice tone="info">
          <p>
            {t(
              "Uplatu potvrdite kada je vidite na izvodu banke. Poziv na broj pomaže da je pronađete.",
              "Confirm the payment when you see it on the bank statement. The reference number helps you find it."
            )}
          </p>
        </Notice>
        <div style={{ marginTop: "0.75rem" }}>
          <Segment
            label={t("Status uplate", "Payment status")}
            options={(["awaiting_payment", "paid", "failed"] as const).map((value) => ({ value, label: pick(PAYMENT_STATUS[value], language) }))}
            value={payment}
            onChange={(value) => {
              if (value !== payment) void setPayment(value);
            }}
          />
        </div>
        <dl className="adm-dl" style={{ marginTop: "0.75rem" }}>
          <dt>{t("Iznos", "Amount")}</dt>
          <dd className="adm-strong tabular">{formatMoney(order.ipsAmountRsd ?? order.totalAmount, "RSD")}</dd>
          <dt>{t("Poziv na broj", "Reference")}</dt>
          <dd className="tabular">{order.ipsReference ?? "–"}</dd>
          {order.ipsExchangeRate ? (
            <>
              <dt>{t("Kurs NBS", "NBS rate")}</dt>
              <dd className="tabular">
                {order.ipsExchangeRate} ({order.ipsExchangeRateDate ?? ""})
              </dd>
            </>
          ) : null}
          <dt>{t("Primalac", "Payee")}</dt>
          <dd>
            {order.ipsPayeeName ?? "–"} {order.ipsPayeeAccount ? `· ${order.ipsPayeeAccount}` : ""}
          </dd>
        </dl>
      </section>

      <section>
        <p className="adm-section-title">{t("Stavke", "Items")}</p>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">{t("Program", "Program")}</th>
                <th scope="col" data-align="end">
                  {t("Kom.", "Qty")}
                </th>
                <th scope="col" data-align="end">
                  {t("Cena", "Price")}
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.title}</td>
                  <td data-align="end">{item.quantity}</td>
                  <td data-align="end">{formatMoney(item.price, item.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {order.note ? (
          <>
            <p className="adm-section-title" style={{ marginTop: "1rem" }}>
              {t("Napomena kupca", "Customer note")}
            </p>
            <p className="adm-note__text">{order.note}</p>
          </>
        ) : null}
      </section>

      <Notes kind="order" id={order._id} notes={order.notes} />
    </>
  );
}
