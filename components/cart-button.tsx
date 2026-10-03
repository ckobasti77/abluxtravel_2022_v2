"use client";

import { ShoppingBag } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { hydrateCartStore, useCartStore } from "@/lib/store/use-cart-store";
import { useSitePreferences } from "./site-preferences-provider";
import CartDrawer from "./cart-drawer";

const subscribeHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

type CartButtonProps = {
  className?: string;
};

/** Cart icon for the navigation. Renders nothing while the cart is empty (only ABLux programs use it). */
export default function CartButton({ className = "snav__icon" }: CartButtonProps) {
  const { dictionary } = useSitePreferences();
  const itemCount = useCartStore((s) => s.itemCount());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isHydrated = useSyncExternalStore(subscribeHydration, getClientHydrationSnapshot, getServerHydrationSnapshot);

  useEffect(() => {
    hydrateCartStore();
  }, []);

  const visibleItemCount = isHydrated ? itemCount : 0;

  if (visibleItemCount === 0 && !drawerOpen) return null;

  return (
    <>
      {visibleItemCount > 0 ? (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={`${dictionary.cart.title} (${visibleItemCount})`}
          title={dictionary.cart.title}
          className={`${className} snav__cart`}
        >
          <ShoppingBag aria-hidden="true" strokeWidth={1.5} />
          <span className="snav__cart-count" aria-hidden="true">
            {visibleItemCount > 99 ? "99+" : visibleItemCount}
          </span>
        </button>
      ) : null}

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
