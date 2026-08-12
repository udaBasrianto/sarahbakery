import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const KEY = "referral_code";

/** Capture ?ref=CODE from URL and persist in localStorage for 30 days. */
export function useReferralTracking() {
  const [params] = useSearchParams();
  useEffect(() => {
    const ref = params.get("ref");
    if (ref) {
      const payload = { code: ref.toUpperCase(), expiresAt: Date.now() + 30 * 24 * 3600 * 1000 };
      localStorage.setItem(KEY, JSON.stringify(payload));
    }
  }, [params]);
}

export function getStoredReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.code || (p.expiresAt && p.expiresAt < Date.now())) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p.code as string;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode() {
  localStorage.removeItem(KEY);
}
