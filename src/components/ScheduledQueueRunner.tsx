"use client";

import { useEffect } from "react";
import { processDueScheduledEmails } from "@/lib/schedulerService";
import { toast } from "sonner";

export default function ScheduledQueueRunner() {
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const res = await processDueScheduledEmails();
        if (res.sent > 0) {
          toast.success(
            `🚀 ${res.sent} candidature${res.sent > 1 ? "s" : ""} programmée${
              res.sent > 1 ? "s" : ""
            } envoyée${res.sent > 1 ? "s" : ""} avec succès !`
          );
        }
        if (res.failed > 0) {
          toast.error(
            `⚠️ ${res.failed} candidature${res.failed > 1 ? "s" : ""} programmée${
              res.failed > 1 ? "s" : ""
            } n'ont pas pu être envoyées.`
          );
        }
      } catch (err) {
        console.warn("Scheduler runner check error:", err);
      }
    };

    // Check immediately on mount
    void checkQueue();

    // Check every 30 seconds
    const interval = setInterval(checkQueue, 30000);

    // Check when user refocuses window/tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkQueue();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}

