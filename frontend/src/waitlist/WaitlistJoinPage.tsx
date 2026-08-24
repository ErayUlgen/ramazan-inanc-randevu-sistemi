import { CalendarDotsIcon as CalendarClock } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import { ListPlusIcon as ListPlus } from "@phosphor-icons/react/dist/csr/ListPlus";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "../components/booking/BrandHeader";
import { Button } from "../components/ui/button";
import { getCatalog } from "../lib/api";
import type { BranchCatalog } from "../types";
import "../booking-access/bookingAccess.css";

const API_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

export function WaitlistJoinPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const branchSlug = query.get("branch") ?? "hair-art-ramazan-inanc-denizli";
  const serviceIds = useMemo(
    () => (query.get("services") ?? "").split(",").filter(Boolean),
    [query],
  );
  const requestedProfessionalId = query.get("professional") || undefined;
  const initialDate = validDate(query.get("date"))
    ? query.get("date")!
    : today();
  const [catalog, setCatalog] = useState<BranchCatalog | null>(null);
  const [stage, setStage] = useState<"form" | "otp" | "success">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("21:00");
  const [note, setNote] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const validServiceIds = useMemo(
    () =>
      catalog
        ? serviceIds.filter((id) =>
            catalog.services.some((service) => service.id === id),
          )
        : [],
    [catalog, serviceIds],
  );
  const professionalId = useMemo(
    () =>
      requestedProfessionalId &&
      catalog?.professionals.some(
        (professional) =>
          professional.id === requestedProfessionalId &&
          validServiceIds.every((id) => professional.serviceIds.includes(id)),
      )
        ? requestedProfessionalId
        : undefined,
    [catalog?.professionals, requestedProfessionalId, validServiceIds],
  );

  useEffect(() => {
    void getCatalog(branchSlug)
      .then(setCatalog)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Salon bilgisi yüklenemedi.",
        ),
      );
  }, [branchSlug]);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api<{
        challengeId: string;
        developmentCode?: string;
      }>("/waitlist/request-code", {
        method: "POST",
        body: JSON.stringify({
          branchSlug,
          fullName,
          phone,
          serviceIds: validServiceIds,
          professionalId,
          dateFrom,
          dateTo,
          startTime,
          endTime,
          note: note.trim() || undefined,
        }),
      });
      if (!response.challengeId)
        throw new Error(
          "Doğrulama isteği tamamlanamadı. Biraz sonra tekrar deneyin.",
        );
      setChallengeId(response.challengeId);
      setDevelopmentCode(response.developmentCode ?? "");
      setStage("otp");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Kod gönderilemedi.",
      );
    } finally {
      setBusy(false);
    }
  };
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/waitlist/verify-code", {
        method: "POST",
        body: JSON.stringify({ challengeId, code }),
      });
      setStage("success");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Kod doğrulanamadı.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell booking-access-shell">
      <section
        className="compact-brand-stage"
        aria-label="Ramazan İnanç Hair Art Studio"
      >
        <BrandHeader dataMode="live" href="/" />
      </section>
      <main className="booking-access-main">
        <section className="access-card waitlist-join-card">
          <div className="access-card__intro">
            <span className="access-card__icon">
              {stage === "success" ? <CheckCircle2 /> : <ListPlus />}
            </span>
            <div>
              <small>Akıllı bekleme listesi</small>
              <h1>
                {stage === "success"
                  ? "Kaydın hazır."
                  : "Uygun saat açıldığında haber al."}
              </h1>
              <p>
                {stage === "success"
                  ? "Tercihlerine uyan bir saat açılırsa sana süreli bir teklif göndereceğiz."
                  : "Tercihlerini bırak; eşleşen ilk boşlukta sana SMS ile ulaşalım."}
              </p>
            </div>
          </div>
          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}
          {stage === "form" && (
            <form className="access-form waitlist-form" onSubmit={requestCode}>
              <label>
                <span>Ad soyad</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label>
                <span>Cep telefonu</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </label>
              <div className="waitlist-selection-summary">
                <ShieldCheck />
                <span>
                  <strong>
                    {catalog
                      ? catalog.services
                          .filter((service) =>
                            validServiceIds.includes(service.id),
                          )
                          .map((service) => service.name)
                          .join(" · ") || "Geçerli bir hizmet seçilmedi"
                      : "Hizmetler hazırlanıyor"}
                  </strong>
                  <small>
                    {professionalId && catalog
                      ? catalog.professionals.find(
                          (item) => item.id === professionalId,
                        )?.name
                      : "İlk müsait uzman"}
                  </small>
                </span>
              </div>
              <div className="waitlist-date-grid">
                <label>
                  <span>Başlangıç tarihi</span>
                  <input
                    type="date"
                    min={today()}
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      if (dateTo < event.target.value)
                        setDateTo(event.target.value);
                    }}
                  />
                </label>
                <label>
                  <span>Bitiş tarihi</span>
                  <input
                    type="date"
                    min={dateFrom}
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </label>
              </div>
              <div className="waitlist-date-grid">
                <label>
                  <span>En erken saat</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </label>
                <label>
                  <span>En geç saat</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>
                  Kısa not <small>isteğe bağlı</small>
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                />
              </label>
              <Button
                type="submit"
                disabled={busy || !catalog || !validServiceIds.length}
              >
                {busy ? "Kod gönderiliyor…" : "Telefonumu doğrula"}
              </Button>
            </form>
          )}
          {stage === "otp" && (
            <form className="access-form" onSubmit={verify}>
              <div className="waitlist-selection-summary">
                <Clock3 />
                <span>
                  <strong>SMS doğrulaması</strong>
                  <small>6 haneli kodu girerek kaydını tamamla.</small>
                </span>
              </div>
              <label>
                <span>Doğrulama kodu</span>
                <input
                  className="access-code-input"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              {developmentCode && (
                <div className="access-dev-code">
                  <span>Geliştirme kodu</span>
                  <strong>{developmentCode}</strong>
                </div>
              )}
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? "Doğrulanıyor…" : "Bekleme listesine katıl"}
              </Button>
            </form>
          )}
          {stage === "success" && (
            <div className="waitlist-success">
              <CalendarClock />
              <strong>
                {formatDate(dateFrom)}–{formatDate(dateTo)}
              </strong>
              <span>
                {startTime}–{endTime} arasında uygun saat aranacak.
              </span>
              <Button asChild>
                <a href="/">Randevu ekranına dön</a>
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

async function api<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  if (!response.ok)
    throw new Error(
      Array.isArray(body?.message)
        ? body.message[0]
        : (body?.message ?? "İşlem tamamlanamadı."),
    );
  return body as T;
}
function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}
function validDate(value: string | null) {
  return Boolean(
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today(),
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00+03:00`));
}
