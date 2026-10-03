import { cn, formatAmount } from "./cn";

export type PriceBasis =
  | "perPerson"
  | "perPersonNight"
  | "perApartment"
  | "perUnit"
  | "perUnitNight"
  | "perDay"
  | "perStay"
  | "totalForTwo"
  | "total";

const BASIS_LABELS: Record<"sr" | "en", Record<PriceBasis, string>> = {
  sr: {
    perPerson: "po osobi",
    perPersonNight: "po osobi za noćenje",
    perApartment: "po apartmanu",
    perUnit: "po smeštajnoj jedinici",
    perUnitNight: "po smeštajnoj jedinici za noćenje",
    perDay: "po danu",
    perStay: "za ceo boravak",
    totalForTwo: "ukupno za 2 osobe",
    total: "ukupno",
  },
  en: {
    perPerson: "per person",
    perPersonNight: "per person per night",
    perApartment: "per apartment",
    perUnit: "per room or unit",
    perUnitNight: "per room or unit per night",
    perDay: "per day",
    perStay: "for the whole stay",
    totalForTwo: "total for 2 people",
    total: "total",
  },
};

const CURRENCY_SIGN: Record<string, string> = { EUR: "€", RSD: "RSD" };

const COPY = {
  sr: { from: "od", onRequest: "Cena na upit", nbs: "Cene su u evrima; plaćanje u dinarima po srednjem kursu NBS na dan uplate." },
  en: {
    from: "from",
    onRequest: "Price on request",
    nbs: "Prices are in euros; payment in dinars at the NBS middle rate on the day of payment.",
  },
};

type PriceProps = {
  /** Amount (EUR by default). Without an amount (or without a basis) the price is "na upit". */
  amount?: number | null;
  /** ISO code; ABLux programs may be priced in RSD. The NBS note is shown for EUR only. */
  currency?: string;
  /** Previous price, shown struck through ("1.290 €" → "990 €"). */
  oldAmount?: number | null;
  basis?: PriceBasis | null;
  /** Shows "od" before the amount (default true: offers start from a price). */
  from?: boolean;
  /** NBS note (detail pages, booking summary). */
  showNbsNote?: boolean;
  language?: "sr" | "en";
  /** "paper" for use on paper objects (tickets), "theme" to follow Papir/Tinta. */
  surface?: "paper" | "theme";
  className?: string;
};

/** "od 1.290 €" + basis. A price is never rendered in gold and never without its basis. */
export function Price({
  amount,
  basis,
  currency = "EUR",
  oldAmount,
  from = true,
  showNbsNote = false,
  language = "sr",
  surface = "paper",
  className,
}: PriceProps) {
  const copy = COPY[language];
  const hasPrice = typeof amount === "number" && Number.isFinite(amount) && amount > 0 && Boolean(basis);
  const sign = CURRENCY_SIGN[currency] ?? currency;
  const showOld = hasPrice && typeof oldAmount === "number" && oldAmount > (amount as number);

  return (
    <div className={cn("ui-price", surface === "theme" && "ui-price--theme", className)}>
      {hasPrice ? (
        <>
          <span className="ui-price__line">
            {from ? <span className="ui-price__from">{copy.from}</span> : null}
            {showOld ? <s className="ui-price__old">{`${formatAmount(oldAmount as number)} ${sign}`}</s> : null}
            <span className="ui-price__amount">{`${formatAmount(amount as number)} ${sign}`}</span>
          </span>
          <span className="ui-price__basis">{BASIS_LABELS[language][basis as PriceBasis]}</span>
        </>
      ) : (
        <span className="ui-price__on-request">{copy.onRequest}</span>
      )}
      {showNbsNote && hasPrice && currency === "EUR" ? <span className="ui-price__note">{copy.nbs}</span> : null}
    </div>
  );
}
