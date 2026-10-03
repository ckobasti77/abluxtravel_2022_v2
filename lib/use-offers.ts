import { useMemo } from "react";
import { useQueries, type RequestForQueries } from "convex/react";
import { api } from "../convex/_generated/api";

export type SourceStatus =
  | "active"
  | "paused"
  | "blocked"
  | "manual"
  | "planned"
  | "connected"
  | "syncing";

export type OfferSource = {
  id: string;
  slug: string;
  name: string;
  status: SourceStatus;
  syncEverySeconds: number;
  lastSyncAt?: number;
  updatedAt: number;
};

export type AggregatedOffer = {
  id: string;
  sourceSlug: string;
  externalId: string;
  title: string;
  destination: string;
  departureCity?: string;
  departureDate?: string;
  returnDate?: string;
  price: number;
  currency: string;
  seatsLeft?: number;
  tags: string[];
  pdfStorageId?: string;
  pdfFileName?: string;
  pdfUrl?: string;
  imageStorageIds?: string[];
  imageUrls?: string[];
  navTitle?: string;
  categoryId?: string;
  updatedAt: number;
};

// No demo fallbacks: with no Convex data the UI renders an empty state, never fake offers.
const EMPTY_SOURCES: OfferSource[] = [];
const EMPTY_OFFERS: AggregatedOffer[] = [];

type ConvexSource = {
  _id: string;
  slug: string;
  name: string;
  status: SourceStatus;
  syncEverySeconds: number;
  lastSyncAt?: number;
  updatedAt: number;
};

type ConvexOffer = {
  _id: string;
  sourceSlug: string;
  externalId: string;
  title: string;
  destination: string;
  departureCity?: string;
  departureDate?: string;
  returnDate?: string;
  price: number;
  currency: string;
  seatsLeft?: number;
  tags: string[];
  pdfStorageId?: string;
  pdfFileName?: string;
  pdfUrl?: string;
  imageStorageIds?: string[];
  imageUrls?: string[];
  navTitle?: string;
  categoryId?: string;
  updatedAt: number;
};

export const useOfferSources = (fallback?: OfferSource[]) => {
  const base = fallback ?? EMPTY_SOURCES;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const sourceQueries = useMemo(() => {
    if (!convexUrl) {
      return {} as RequestForQueries;
    }
    return {
      listSources: {
        query: api.offers.listSources,
        args: {},
      },
    } as RequestForQueries;
  }, [convexUrl]);
  const sourceQuery = useQueries(sourceQueries);
  const rows = sourceQuery.listSources;

  return useMemo<OfferSource[]>(() => {
    if (!rows || rows instanceof Error) {
      return base;
    }
    return (rows as ConvexSource[]).map((source) => ({
      id: source._id,
      slug: source.slug,
      name: source.name,
      status: source.status,
      syncEverySeconds: source.syncEverySeconds,
      lastSyncAt: source.lastSyncAt,
      updatedAt: source.updatedAt,
    }));
  }, [base, rows]);
};

export const useOffersLiveBoard = (destination?: string, fallback?: AggregatedOffer[]) => {
  const base = fallback ?? EMPTY_OFFERS;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const normalizedDestination = destination?.trim();
  const liveBoardQueries = useMemo(() => {
    if (!convexUrl) {
      return {} as RequestForQueries;
    }
    return {
      listLiveBoard: {
        query: api.offers.listLiveBoard,
        args: normalizedDestination
          ? {
              limit: 40,
              destination: normalizedDestination,
            }
          : {
              limit: 40,
            },
      },
    } as RequestForQueries;
  }, [convexUrl, normalizedDestination]);
  const liveBoardQuery = useQueries(liveBoardQueries);
  const rows = liveBoardQuery.listLiveBoard;

  return useMemo<AggregatedOffer[]>(() => {
    const data = rows && !(rows instanceof Error)
      ? (rows as ConvexOffer[]).map((offer) => ({
          id: offer._id,
          sourceSlug: offer.sourceSlug,
          externalId: offer.externalId,
          title: offer.title,
          destination: offer.destination,
          departureCity: offer.departureCity,
          departureDate: offer.departureDate,
          returnDate: offer.returnDate,
          price: offer.price,
          currency: offer.currency,
          seatsLeft: offer.seatsLeft,
          tags: offer.tags,
          pdfStorageId: offer.pdfStorageId,
          pdfFileName: offer.pdfFileName,
          pdfUrl: offer.pdfUrl,
          imageStorageIds: offer.imageStorageIds,
          imageUrls: offer.imageUrls,
          navTitle: offer.navTitle,
          categoryId: (offer as ConvexOffer & { categoryId?: string }).categoryId,
          updatedAt: offer.updatedAt,
        }))
      : base;

    if (!normalizedDestination) {
      return data;
    }

    const query = normalizedDestination.toLowerCase();
    return data.filter((offer) => offer.destination.toLowerCase().includes(query));
  }, [base, normalizedDestination, rows]);
};
