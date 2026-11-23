"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = "BDr870e2VZY_CI2KphF_dUqqkMKCUan-BsUrHBV0AFdHdeMwp85oqna2Y5mnE6A_f7d1afO4sQPsrJjARKDnPFA";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setPermission(Notification.permission);

      // Register SW
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true);
            // Sync with backend
            fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscription: sub, userAgent: navigator.userAgent })
            }).catch(() => {});
          } else if (Notification.permission === "default") {
            // Prompt after short delay for user friendliness
            setTimeout(() => setShowPrompt(true), 2500);
          }
        });
      });
    }
  }, []);

  const enableNotifications = async () => {
    try {
      setShowPrompt(false);
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub, userAgent: navigator.userAgent })
        });

        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
  };

  if (!showPrompt || isSubscribed || permission === "denied") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-xl shadow-2xl p-4 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0 text-lg">
          🔔
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Enable Plant Offline Alerts</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Get instant Web Push alerts on your laptop and mobile when a plant stops transmitting data or goes offline.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-1">
        <button
          onClick={() => setShowPrompt(false)}
          className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          Later
        </button>
        <button
          onClick={enableNotifications}
          className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition flex items-center gap-1.5"
        >
          Enable Alerts
        </button>
      </div>
    </div>
  );
}
