import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export type TripStatus = "active" | "upcoming" | "completed";
export type TransportType = "bus" | "plane" | "car" | "train" | "self";
export type TripHeroMediaType = "video" | "image";

export type TripDetailMedia = {
  storageId: string;
  mediaType: TripHeroMediaType;
  mediaName?: string;
  url: string;
};

export type Trip = {
  _id: string;
  _creationTime?: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  nights: number;
  days: number;
  transport: TransportType;
  departureDate: string;
  returnDate: string;
  departureCity: string;
  hotelInfo?: string;
  depositPercentage?: number;
  depositDeadline?: string;
  itinerary: { day: number; date: string; description: string }[];
  included: string[];
  notIncluded: string[];
  imageStorageIds: string[];
  imageUrls: string[];
  detailMedia?: TripDetailMedia[];
  heroMediaType?: TripHeroMediaType;
  heroMediaStorageId?: string;
  heroMediaName?: string;
  heroMediaUrl?: string | null;
  destinationCount?: number;
  subagencyDestinationCount?: number;
  lowestDestinationPrice?: number;
  lowestDestinationCurrency?: string;
  status: TripStatus;
  categoryId?: string;
  isHero?: boolean;
  heroIcon?: string;
  featured: boolean;
  order: number;
  updatedAt: number;
};

type TripSortFields = Pick<Trip, "title" | "order" | "updatedAt" | "_creationTime">;

export const compareTripsNewestFirst = (
  a: TripSortFields,
  b: TripSortFields
) => {
  const byCreationTime = (b._creationTime ?? 0) - (a._creationTime ?? 0);
  if (byCreationTime !== 0) return byCreationTime;

  const byUpdatedAt = b.updatedAt - a.updatedAt;
  if (byUpdatedAt !== 0) return byUpdatedAt;

  return b.order - a.order || a.title.localeCompare(b.title, "sr");
};

export const sortTripsNewestFirst = <T extends TripSortFields>(
  trips: readonly T[]
) => [...trips].sort(compareTripsNewestFirst);

export const useTrips = (options?: {
  status?: TripStatus;
  featuredOnly?: boolean;
}): Trip[] => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const data = useQuery(
    api.trips.list,
    convexUrl
      ? {
          status: options?.status,
          featuredOnly: options?.featuredOnly,
        }
      : "skip"
  );

  return useMemo<Trip[]>(() => {
    if (!data) return [];
    return data as unknown as Trip[];
  }, [data]);
};

export const useTripBySlug = (slug: string): Trip | null | undefined => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const data = useQuery(api.trips.getBySlug, convexUrl ? { slug } : "skip");

  return useMemo(() => {
    if (data === undefined) return undefined;
    if (data === null) return null;
    return data as unknown as Trip;
  }, [data]);
};
