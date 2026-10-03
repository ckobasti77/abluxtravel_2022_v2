import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export type CategoryType = "arrangement" | "religious";

export type Category = {
  _id: string;
  name: { sr: string; en: string };
  slug: string;
  type: CategoryType;
  isMain?: boolean;
  mainIcon?: string;
  isActive: boolean;
  order: number;
  itemCount: number;
  updatedAt: number;
};

export type HeroData = {
  heroTrip: { slug: string; title: string; icon: string } | null;
  arrangement: (Category & { mainIcon: string }) | null;
  religious: (Category & { mainIcon: string }) | null;
};

const hasConvex = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export function useCategories(type?: CategoryType): Category[] {
  const data = useQuery(
    api.categories.list,
    hasConvex ? { type } : "skip"
  );
  return (data as Category[] | undefined) ?? [];
}

export function useCategoriesAll(type?: CategoryType): Category[] {
  const data = useQuery(
    api.categories.listAll,
    hasConvex ? { type } : "skip"
  );
  return (data as Category[] | undefined) ?? [];
}

export function useHeroData(): HeroData | null {
  const data = useQuery(
    api.categories.heroData,
    hasConvex ? {} : "skip"
  );
  return (data as HeroData | undefined) ?? null;
}
