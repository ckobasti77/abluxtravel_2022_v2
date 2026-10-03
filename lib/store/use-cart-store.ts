"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItemType = "trip" | "destination" | "offer" | "accommodation";

export type CartItem = {
  /** Convex document _id */
  id: string;
  type: CartItemType;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  /** Optional image URL for display */
  imageUrl?: string;
  /** Extra metadata (departure date, destination, etc.) */
  meta?: Record<string, string>;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: () => number;
  total: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "ablux_cart",
      skipHydration: true,
    }
  )
);

let cartHydrationStarted = false;

export const hydrateCartStore = () => {
  if (cartHydrationStarted) return;
  cartHydrationStarted = true;
  void useCartStore.persist.rehydrate();
};
