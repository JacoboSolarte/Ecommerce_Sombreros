"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, isApiError } from "@/lib/api";
import { GUEST_CART_KEY } from "@/lib/constants";
import type { GuestCartLine, User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  /** true until the first /auth/me check has finished */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function readGuestCart(): GuestCartLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is GuestCartLine =>
        !!l &&
        typeof (l as GuestCartLine).variantId === "number" &&
        typeof (l as GuestCartLine).quantity === "number" &&
        (l as GuestCartLine).quantity > 0,
    );
  } catch {
    return [];
  }
}

export function writeGuestCart(lines: GuestCartLine[]) {
  try {
    if (lines.length === 0) localStorage.removeItem(GUEST_CART_KEY);
    else localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable: the guest cart simply does not persist */
  }
}

async function mergeGuestCart() {
  const lines = readGuestCart();
  if (lines.length === 0) return;
  try {
    await api("/cart/merge", { method: "POST", body: { items: lines } });
    writeGuestCart([]);
  } catch {
    // keep the local cart so nothing is lost; the user can retry on next login
  }
}

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);

  useEffect(() => {
    if (initialUser) return;
    let alive = true;
    api<User>("/auth/me")
      .then((u) => alive && setUser(u))
      .catch((e) => {
        if (alive && !(isApiError(e) && e.status === 401)) setUser(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [initialUser]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api<User>("/auth/login", { method: "POST", body: { email, password } });
    await mergeGuestCart();
    setUser(u);
    return u;
  }, []);

  const register = useCallback(
    async (input: { fullName: string; email: string; password: string; phone?: string }) => {
      const u = await api<User>("/auth/register", { method: "POST", body: input });
      await mergeGuestCart();
      setUser(u);
      return u;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
