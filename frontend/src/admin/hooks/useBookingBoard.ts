import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminBookingBoard } from "../admin.types";
import { AdminApiError, getAdminBookingBoard } from "../api/adminApi";

const BRANCH_SLUG = "hair-art-ramazan-inanc-denizli";
const POLL_INTERVAL_MS = 15_000;

export function useBookingBoard(date: string, onUnauthorized: () => void) {
  const [data, setData] = useState<AdminBookingBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(
    async (silent = false) => {
      const sequence = ++requestSequence.current;
      if (!silent) setRefreshing(true);
      setError(null);
      try {
        const board = await getAdminBookingBoard(BRANCH_SLUG, date);
        if (sequence !== requestSequence.current) return;
        setData(board);
        setLastUpdatedAt(new Date());
      } catch (requestError) {
        if (sequence !== requestSequence.current) return;
        if (
          requestError instanceof AdminApiError &&
          requestError.status === 401
        ) {
          onUnauthorized();
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Randevu panosu yüklenemedi.",
        );
      } finally {
        if (sequence === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [date, onUnauthorized],
  );

  useEffect(() => {
    setLoading(true);
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      window.clearInterval(timer);
      if (document.visibilityState === "visible") {
        timer = window.setInterval(() => void refresh(true), POLL_INTERVAL_MS);
      }
    };
    const handleVisibility = () => {
      schedule();
      if (document.visibilityState === "visible") void refresh(true);
    };
    schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  return {
    data,
    loading,
    refreshing,
    error,
    lastUpdatedAt,
    refresh,
  };
}
