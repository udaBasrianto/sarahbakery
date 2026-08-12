import React, { useEffect, useState } from "react";
import { Download, X, Sparkles, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1) Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.error("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    // 2) Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user dismissed recently (24 hours)
      const dismissedTime = localStorage.getItem("pwa-prompt-dismissed");
      if (!dismissedTime || Date.now() - Number(dismissedTime) > 86400000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setShowPrompt(false);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("[PWA] User accepted install prompt");
    } else {
      console.log("[PWA] User dismissed install prompt");
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-700 via-orange-600 to-amber-600 text-white p-4 shadow-2xl border border-amber-400/30 backdrop-blur-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-amber-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 text-2xl shadow-inner">
            🧁
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Install Aplikasi
            </div>
            <h4 className="font-bold text-sm leading-snug">
              Pasang Sarah Bakery di HP Anda
            </h4>
            <p className="text-xs text-amber-100/90 leading-relaxed">
              Akses cepat tanpa perlu browser, hemat kuota & dapat dibuka saat offline.
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-amber-100 hover:text-white hover:bg-white/10 h-8 px-3 rounded-lg"
          >
            Nanti Saja
          </Button>
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="text-xs font-semibold bg-white text-amber-800 hover:bg-amber-50 h-8 px-3.5 rounded-lg shadow-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Install Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
};
