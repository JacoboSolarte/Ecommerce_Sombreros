"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, isApiError } from "@/lib/api";
import { onlyLeft } from "@/lib/format";
import type { Cart, CartItem, GuestCartLine } from "@/lib/types";
import { useAuth, readGuestCart, writeGuestCart } from "./auth";

const EMPTY_CART: Cart = {
  items: [],
  itemCount: 0,
  totals: {
    totalItemsCop: 0,
    subtotalCop: 0,
    taxCop: 0,
    shippingCop: 0,
    totalCop: 0,
  },
};

export type CartResult =
  | { ok: true; item: CartItem | null }
  | { ok: false; message: string; available?: number };

interface CartValue {
  cart: Cart;
  /** true during the first load of the cart */
  loading: boolean;
  count: number;
  /** Bumps each time something is added, used by the header badge animation. */
  addedTick: number;
  lastAdded: CartItem | null;
  dismissLastAdded: () => void;
  /** Lines the last checkout attempt flagged: variantId -> units available */
  stockFlags: Record<number, number>;
  setStockFlags: (flags: Record<number, number>) => void;
  lineMessages: Record<number, string>;
  add: (variantId: number, quantity: number) => Promise<CartResult>;
  setQuantity: (item: CartItem, quantity: number) => Promise<CartResult>;
  remove: (item: CartItem) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

function linesOf(cart: Cart): GuestCartLine[] {
  return cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
}

function withQuantity(cart: Cart, item: CartItem, quantity: number): Cart {
  const items = cart.items.map((i) =>
    i.variantId === item.variantId
      ? { ...i, quantity, lineTotalCop: i.unitPriceCop * quantity }
      : i,
  );
  return { ...cart, items, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [addedTick, setAddedTick] = useState(0);
  const [lastAdded, setLastAdded] = useState<CartItem | null>(null);
  const [stockFlags, setStockFlagsState] = useState<Record<number, number>>({});
  const [lineMessages, setLineMessages] = useState<Record<number, string>>({});
  const [announce, setAnnounce] = useState("");
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const loggedIn = !!user;

  const quote = useCallback(async (lines: GuestCartLine[]): Promise<Cart> => {
    if (lines.length === 0) return EMPTY_CART;
    return api<Cart>("/cart/quote", { method: "POST", body: { items: lines } });
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (loggedIn) {
        setCart(await api<Cart>("/cart"));
      } else {
        const lines = readGuestCart();
        const q = await quote(lines);
        setCart(q);
        // drop lines the catalog no longer knows
        if (q.items.length !== lines.length) writeGuestCart(linesOf(q));
      }
    } catch {
      // keep what we have; header badge falls back to the last known count
    } finally {
      setLoading(false);
    }
  }, [loggedIn, quote]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const say = useCallback((msg: string) => {
    setAnnounce("");
    window.setTimeout(() => setAnnounce(msg), 20);
  }, []);

  const add = useCallback(
    async (variantId: number, quantity: number): Promise<CartResult> => {
      const before = cartRef.current;
      const existing = before.items.find((i) => i.variantId === variantId);
      try {
        let next: Cart;
        if (loggedIn) {
          setCart({ ...before, itemCount: before.itemCount + quantity });
          next = await api<Cart>("/cart/items", {
            method: "POST",
            body: { variantId, quantity },
          });
        } else {
          const lines = linesOf(before);
          const line = lines.find((l) => l.variantId === variantId);
          if (line) line.quantity += quantity;
          else lines.push({ variantId, quantity });
          next = await quote(lines);
          const got = next.items.find((i) => i.variantId === variantId);
          if (got && got.quantity > got.stock) {
            const available = Math.max(0, got.stock - (existing?.quantity ?? 0));
            return { ok: false, message: onlyLeft(got.stock), available };
          }
          writeGuestCart(linesOf(next));
        }
        setCart(next);
        const item = next.items.find((i) => i.variantId === variantId) ?? null;
        setLastAdded(item);
        setAddedTick((t) => t + 1);
        setStockFlagsState({});
        say(`${item?.name ?? "Producto"} agregado al carrito. ${next.itemCount} en total.`);
        return { ok: true, item };
      } catch (e) {
        setCart(before);
        if (isApiError(e) && e.code === "OUT_OF_STOCK") {
          const available = Number((e.details as { available?: number } | null)?.available ?? 0);
          return { ok: false, message: onlyLeft(available), available };
        }
        return {
          ok: false,
          message: isApiError(e) ? e.message : "No pudimos agregar el producto.",
        };
      }
    },
    [loggedIn, quote, say],
  );

  const setQuantity = useCallback(
    async (item: CartItem, quantity: number): Promise<CartResult> => {
      const before = cartRef.current;
      setLineMessages((m) => {
        const { [item.variantId]: _drop, ...rest } = m;
        void _drop;
        return rest;
      });
      setCart(withQuantity(before, item, quantity));
      try {
        let next: Cart;
        if (loggedIn) {
          next = await api<Cart>(`/cart/items/${item.id}`, {
            method: "PATCH",
            body: { quantity },
          });
        } else {
          const lines = linesOf(before).map((l) =>
            l.variantId === item.variantId ? { ...l, quantity } : l,
          );
          next = await quote(lines);
          const got = next.items.find((i) => i.variantId === item.variantId);
          if (got && got.quantity > got.stock) throw new LocalStockError(got.stock);
          writeGuestCart(linesOf(next));
        }
        setCart(next);
        setStockFlagsState((f) => {
          const { [item.variantId]: _d, ...rest } = f;
          void _d;
          return rest;
        });
        say(`Cantidad actualizada a ${quantity}.`);
        return { ok: true, item: next.items.find((i) => i.variantId === item.variantId) ?? null };
      } catch (e) {
        setCart(before);
        let message = isApiError(e) ? e.message : "No pudimos actualizar la cantidad.";
        let available: number | undefined;
        if (e instanceof LocalStockError) {
          available = e.available;
          message = onlyLeft(e.available);
        } else if (isApiError(e) && e.code === "OUT_OF_STOCK") {
          available = Number((e.details as { available?: number } | null)?.available ?? item.stock);
          message = onlyLeft(available);
        }
        setLineMessages((m) => ({ ...m, [item.variantId]: message }));
        return { ok: false, message, available };
      }
    },
    [loggedIn, quote, say],
  );

  const remove = useCallback(
    async (item: CartItem) => {
      const before = cartRef.current;
      const items = before.items.filter((i) => i.variantId !== item.variantId);
      setCart({ ...before, items, itemCount: items.reduce((s, i) => s + i.quantity, 0) });
      try {
        let next: Cart;
        if (loggedIn) {
          next = await api<Cart>(`/cart/items/${item.id}`, { method: "DELETE" });
        } else {
          const lines = linesOf(before).filter((l) => l.variantId !== item.variantId);
          next = await quote(lines);
          writeGuestCart(linesOf(next));
        }
        setCart(next);
        say(`${item.name} eliminado del carrito.`);
      } catch (e) {
        setCart(before);
        setLineMessages((m) => ({
          ...m,
          [item.variantId]: isApiError(e) ? e.message : "No pudimos eliminar el producto.",
        }));
      }
    },
    [loggedIn, quote, say],
  );

  const dismissLastAdded = useCallback(() => setLastAdded(null), []);
  const setStockFlags = useCallback((f: Record<number, number>) => setStockFlagsState(f), []);

  const value = useMemo<CartValue>(
    () => ({
      cart,
      loading,
      count: cart.itemCount,
      addedTick,
      lastAdded,
      dismissLastAdded,
      stockFlags,
      setStockFlags,
      lineMessages,
      add,
      setQuantity,
      remove,
      refresh,
    }),
    [
      cart,
      loading,
      addedTick,
      lastAdded,
      dismissLastAdded,
      stockFlags,
      setStockFlags,
      lineMessages,
      add,
      setQuantity,
      remove,
      refresh,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>
    </CartContext.Provider>
  );
}

class LocalStockError extends Error {
  available: number;
  constructor(available: number) {
    super("OUT_OF_STOCK");
    this.available = available;
  }
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
