import { Outlet } from "react-router-dom";
import { useReferralTracking } from "@/hooks/useReferralTracking";

/**
 * Locks the customer-facing experience to a mobile-width frame,
 * even on tablet/desktop screens. Admin routes are unaffected.
 */
export function CustomerShell() {
  useReferralTracking();
  return (
    <div className="min-h-screen w-full bg-muted/30 flex justify-center">
      <div className="relative w-full max-w-md min-h-screen bg-background shadow-soft md:shadow-xl overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
