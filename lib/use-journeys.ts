import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Trip } from "./use-trips";

export const useJourneys = (options?: { includeInactive?: boolean }): Trip[] => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const data = useQuery(
    api.slides.listTravelGroups,
    convexUrl
      ? {
          includeInactive: options?.includeInactive,
        }
      : "skip"
  );

  return useMemo<Trip[]>(() => {
    if (!data) return [];
    return data as unknown as Trip[];
  }, [data]);
};

export const useJourneyBySlug = (slug: string): Trip | null | undefined => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const data = useQuery(
    api.slides.getTravelGroupBySlug,
    convexUrl && slug ? { slug } : "skip"
  );

  return useMemo(() => {
    if (data === undefined) return undefined;
    if (data === null) return null;
    return data as unknown as Trip;
  }, [data]);
};
