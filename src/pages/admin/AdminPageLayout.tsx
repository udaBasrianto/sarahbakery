import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * AdminPageLayout — wrapper standar untuk semua halaman admin.
 * Memberikan padding & lebar maksimum yang konsisten di semua halaman.
 */
export default function AdminPageLayout({ children, className }: AdminPageLayoutProps) {
  return (
    <div
      className={cn(
        "p-4 lg:p-8 max-w-7xl mx-auto space-y-6",
        className
      )}
    >
      {children}
    </div>
  );
}
