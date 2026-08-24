import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminWeekBoard } from "../admin.types";
import { AdminApiError, getAdminWeekBoard } from "../api/adminApi";

const BRANCH_SLUG = "hair-art-ramazan-inanc-denizli";

export function useWeekBoard(
  date: string,
  professionalId: string,
  enabled: boolean,
  onUnauthorized: () => void,
) {
  const [data, setData] = useState<AdminWeekBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const current = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const board = await getAdminWeekBoard(
        BRANCH_SLUG,
        date,
        professionalId || undefined,
      );
      if (current === sequence.current) setData(board);
    } catch (reason) {
      if (current !== sequence.current) return;
      if (reason instanceof AdminApiError && reason.status === 401) {
        onUnauthorized();
        return;
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "Haftalık plan yüklenemedi.",
      );
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [date, enabled, onUnauthorized, professionalId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
