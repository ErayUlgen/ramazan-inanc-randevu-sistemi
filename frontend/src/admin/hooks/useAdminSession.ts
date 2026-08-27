import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
} from "../api/adminApi";
import type { AdminIdentity } from "../admin.types";

export type AdminSessionState = "checking" | "guest" | "authenticated";

const LOGIN_LOCK_DURATION_MS = 15 * 60_000;

export function useAdminSession() {
  const [state, setState] = useState<AdminSessionState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AdminIdentity | null>(null);

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((result) => {
        if (!active) return;
        if (!result.authenticated) {
          setState("guest");
          return;
        }
        setUser(result.user);
        window.sessionStorage.setItem(
          "ri_admin_identity",
          JSON.stringify(result.user),
        );
        setState("authenticated");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setState("guest");
        if (
          requestError instanceof AdminApiError &&
          requestError.status !== 401
        ) {
          setError("Yönetici oturumu kontrol edilemedi. Tekrar deneyin.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: { username: string; password: string }) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await createAdminSession(
          import.meta.env.DEV
            ? {
                username: credentials.username,
                password: credentials.password,
                accessKey: credentials.password,
              }
            : credentials,
        );
        setUser(result.user);
        setLockedUntil(null);
        window.sessionStorage.setItem(
          "ri_admin_identity",
          JSON.stringify(result.user),
        );
        setState("authenticated");
      } catch (requestError) {
        if (requestError instanceof AdminApiError && requestError.status === 409) {
          setLockedUntil(Date.now() + LOGIN_LOCK_DURATION_MS);
        } else {
          setLockedUntil(null);
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Giriş tamamlanamadı.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await deleteAdminSession();
    } finally {
      setUser(null);
      window.sessionStorage.removeItem("ri_admin_identity");
      setState("guest");
    }
  }, []);

  const expire = useCallback(() => {
    setUser(null);
    window.sessionStorage.removeItem("ri_admin_identity");
    setState("guest");
  }, []);

  return { state, user, error, lockedUntil, submitting, login, logout, expire };
}
