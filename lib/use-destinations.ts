import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export type Destination = {
  _id: string;
  tripId?: string;
  pageSlug?: string;
  offerType?: "own" | "subagency";
  title: string;
  description: string;
  price: number;
  currency: string;
  departureDate?: string;
  returnDate?: string;
  departureCity?: string;
  durationLabel?: string;
  partnerName?: string;
  partnerOfferCode?: string;
  iframeUrl?: string;
  externalUrl?: string;
  contactNote?: string;
  imageStorageIds: string[];
  imageUrls: string[];
  order: number;
  isActive: boolean;
  updatedAt: number;
};

type ListOptions = {
  /** Admin only: include inactive rows (requires the editor role). */
  includeInactive?: boolean;
};

export const useDestinationsByTrip = (
  tripId: string | undefined,
  options?: ListOptions,
): Destination[] => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const data = useQuery(
    api.destinations.listByTrip,
    convexUrl && tripId
      ? {
          tripId: tripId as Id<"trips">,
          ...(options?.includeInactive ? { includeInactive: true } : {}),
        }
      : "skip",
  );

  return useMemo<Destination[]>(() => {
    if (!data) return [];
    return data as unknown as Destination[];
  }, [data]);
};

export const useDestinationsByPage = (
  pageSlug: string | undefined,
  options?: ListOptions,
): Destination[] => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const data = useQuery(
    api.destinations.listByPage,
    convexUrl && pageSlug
      ? { pageSlug, ...(options?.includeInactive ? { includeInactive: true } : {}) }
      : "skip",
  );

  return useMemo<Destination[]>(() => {
    if (!data) return [];
    return data as unknown as Destination[];
  }, [data]);
};
