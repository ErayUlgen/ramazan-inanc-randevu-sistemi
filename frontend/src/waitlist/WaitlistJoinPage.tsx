import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CalendarDotsIcon as CalendarClock } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon as Clock } from "@phosphor-icons/react/dist/csr/Clock";
import { ListPlusIcon as ListPlus } from "@phosphor-icons/react/dist/csr/ListPlus";
import { NotePencilIcon as NotePencil } from "@phosphor-icons/react/dist/csr/NotePencil";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { WarningCircleIcon as WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandHeader } from "../components/booking/BrandHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { getCatalog } from "../lib/api";
import type { BranchCatalog } from "../types";
import "../booking-access/bookingAccess.css";

const API_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:3000/api`;

type EntryStatus = "ACTIVE" | "OFFERED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
type OfferStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "FAILED";

type WaitlistOffer = {
  id: string;
  status: OfferStatus;
  startAt: string;
  endAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  totalDurationMinutes: number;
  totalPriceKurus: number;
  professional: { id: string; name: string };
  acceptedBooking: { publicCode: string; status: string } | null;
};

type WaitlistEntry = {
  id: string;
  status: EntryStatus;
  fullName: string;
  phoneMasked: string;
  professional: { id: string; name: string } | null;
  services: Array<{ id: string; name: string; durationMinutes: number }>;
  dateFrom: string;
  dateTo: string;
  startMinute: number;
  endMinute: number;
  note: string | null;
  failedOfferCount: number;
  offers: WaitlistOffer[];
  createdAt: string;
  updatedAt: string;
};

type OfferAccess = WaitlistOffer & { entry: WaitlistEntry };
type FieldErrors = Partial<
  Record<"fullName" | "phone" | "dateFrom" | "dateTo" | "time", string>
>;

export function WaitlistJoinPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const branchSlug = query.get("branch") ?? "hair-art-ramazan-inanc-denizli";
  const serviceIds = useMemo(
    () => (query.get("services") ?? "").split(",").filter(Boolean),
    [query],
  );
  const requestedProfessionalId = query.get("professional") || undefined;
  const queryDate = query.get("date");
  const initialDate = validDate(queryDate) ? queryDate! : today();
  const offerToken = useMemo(() => {
    const match = location.pathname.match(
      /^\/bekleme-listesi\/teklif\/([^/]+)$/,
    );
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [location.pathname]);

  const [catalog, setCatalog] = useState<BranchCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [offerLinkError, setOfferLinkError] = useState("");
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [offerAccess, setOfferAccess] = useState<OfferAccess | null>(null);
  const [stage, setStage] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("21:00");
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const countdownActive = otpSeconds > 0 || resendSeconds > 0;

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
  const chosenServices = useMemo(
    () =>
      catalog?.services.filter((service) =>
        validServiceIds.includes(service.id),
      ) ?? [],
    [catalog?.services, validServiceIds],
  );
  const selectedProfessional = catalog?.professionals.find(
    (item) => item.id === professionalId,
  );
  const hasValidContext =
    Boolean(catalog) && validServiceIds.length > 0 && validDate(queryDate);

  const loadCatalog = useCallback(async () => {
    setCatalogError("");
    try {
      setCatalog(await getCatalog(branchSlug));
    } catch (error) {
      setCatalogError(
        errorMessage(error, "Salon bilgileri şu an yüklenemedi."),
      );
    }
  }, [branchSlug]);

  const loadCurrentEntry = useCallback(async () => {
    try {
      const current = await api<WaitlistEntry | null>("/waitlist/current");
      setEntry(current);
      return current;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialise = async () => {
      setLoading(true);
      setMessage("");
      setOfferLinkError("");
      await loadCatalog();
      try {
        if (offerToken) {
          const accessed = await api<OfferAccess>("/waitlist/offers/access", {
            method: "POST",
            body: JSON.stringify({ token: offerToken }),
          });
          if (active) {
            setOfferAccess(accessed);
            setEntry(accessed.entry);
          }
          navigate("/bekleme-listesi/teklif", { replace: true });
        } else if (location.pathname === "/bekleme-listesi/teklif") {
          const accessed = await api<OfferAccess>("/waitlist/offers/current");
          if (active) {
            setOfferAccess(accessed);
            setEntry(accessed.entry);
          }
        } else {
          const current = await loadCurrentEntry();
          if (active && current) setEntry(current);
        }
      } catch (error) {
        if (active) {
          const detail = errorMessage(
            error,
            "Bekleme listesi bilgilerinize şu an ulaşılamadı. Lütfen yeniden deneyin.",
          );
          if (
            offerToken ||
            location.pathname === "/bekleme-listesi/teklif"
          ) {
            setOfferLinkError(detail);
          } else {
            setMessage(detail);
          }
        }
        if (offerToken) navigate("/bekleme-listesi/teklif", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialise();
    return () => {
      active = false;
    };
  }, [loadCatalog, loadCurrentEntry, location.pathname, navigate, offerToken]);

  useEffect(() => {
    if (!countdownActive) return;
    const timer = window.setInterval(() => {
      setOtpSeconds((value) => Math.max(0, value - 1));
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdownActive]);

  const validate = () => {
    const next: FieldErrors = {};
    if (fullName.trim().length < 2)
      next.fullName = "Adınızı ve soyadınızı en az 2 karakterle yazın.";
    if (!validPhone(phone))
      next.phone = "Telefon numaranızı 05xx xxx xx xx biçiminde yazın.";
    if (!validDate(dateFrom))
      next.dateFrom = "Bugün veya ileri bir tarih seçin.";
    if (!validDate(dateTo) || dateTo < dateFrom)
      next.dateTo = "Bitiş tarihi başlangıçtan önce olamaz.";
    if (dayDifference(dateFrom, dateTo) > 90)
      next.dateTo = "Tarih aralığı en fazla 90 gün olabilir.";
    if (minuteValue(startTime) >= minuteValue(endTime))
      next.time = "En geç saat, en erken saatten sonra olmalı.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitCodeRequest = async () => {
    if (!validate() || !validServiceIds.length) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await api<{
        challengeId?: string;
        developmentCode?: string;
        expiresInSeconds: number;
        resendAfterSeconds: number;
        rateLimited?: boolean;
      }>("/waitlist/request-code", {
        method: "POST",
        body: JSON.stringify({
          branchSlug,
          fullName: fullName.trim(),
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
      setResendSeconds(response.resendAfterSeconds);
      if (response.rateLimited || !response.challengeId) {
        setMessage(
          `Çok sık kod istendi. ${response.resendAfterSeconds} saniye sonra yeniden deneyebilirsiniz.`,
        );
        return;
      }
      setChallengeId(response.challengeId);
      setDevelopmentCode(response.developmentCode ?? "");
      setOtpSeconds(response.expiresInSeconds);
      setCode("");
      setStage("otp");
    } catch (error) {
      setMessage(errorMessage(error, "Doğrulama kodu gönderilemedi."));
    } finally {
      setBusy(false);
    }
  };

  const requestCode = (event: FormEvent) => {
    event.preventDefault();
    void submitCodeRequest();
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (otpSeconds <= 0) {
      setMessage("Kodun 5 dakikalık süresi doldu. Yeni kod isteyin.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ authenticated: true; entry: WaitlistEntry }>(
        "/waitlist/verify-code",
        { method: "POST", body: JSON.stringify({ challengeId, code }) },
      );
      setEntry(result.entry);
    } catch (error) {
      setMessage(
        errorMessage(
          error,
          "Kod doğrulanamadı. Kodu kontrol edip yeniden deneyin.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelEntry = async () => {
    setBusy(true);
    setMessage("");
    try {
      await api<{ cancelled: true }>("/waitlist/current", { method: "DELETE" });
      setEntry((current) =>
        current ? { ...current, status: "CANCELLED" } : null,
      );
      setOfferAccess(null);
      setCancelOpen(false);
    } catch (error) {
      setMessage(errorMessage(error, "Bekleme kaydı kapatılamadı."));
    } finally {
      setBusy(false);
    }
  };

  const acceptOffer = async () => {
    const pendingOffer =
      offerAccess ?? entry?.offers.find((item) => item.status === "PENDING");
    if (!pendingOffer) return;
    setBusy(true);
    setMessage("");
    try {
      const result = offerAccess
        ? await api<{
            accepted: true;
            booking: { publicCode: string; status: string };
          }>("/waitlist/offers/current/accept", { method: "POST" })
        : await api<{
            accepted: true;
            booking: { publicCode: string; status: string };
          }>(`/waitlist/offers/${pendingOffer.id}/accept`, { method: "POST" });
      setEntry((current) =>
        current
          ? {
              ...current,
              status: "FULFILLED",
              offers: current.offers.map((item) =>
                item.id === pendingOffer.id
                  ? {
                      ...item,
                      status: "ACCEPTED",
                      acceptedBooking: result.booking,
                    }
                  : item,
              ),
            }
          : current,
      );
      setOfferAccess((current) =>
        current
          ? {
              ...current,
              status: "ACCEPTED",
              acceptedBooking: result.booking,
            }
          : current,
      );
    } catch {
      setMessage(
        "Bu saat artık kullanılamıyor; bekleme kaydınız yeni boşluklar için aktif.",
      );
      try {
        if (offerAccess) {
          const refreshed = await api<OfferAccess>("/waitlist/offers/current");
          setEntry(refreshed.entry);
          setOfferAccess(null);
        } else {
          await loadCurrentEntry();
        }
      } catch {
        // Ana mesaj müşteriye güvenli ve yeterli yönlendirmeyi zaten verir.
      }
    } finally {
      setBusy(false);
    }
  };

  const activeOffer =
    offerAccess ??
    entry?.offers.find((item) => item.status === "PENDING") ??
    null;

  return (
    <div className="app-shell booking-access-shell waitlist-page">
      {/* aria-label bilinçli olarak yok: BrandHeader kendi erişilebilir adını
          görünen metinden zaten üretiyor (bkz. BrandHeader.tsx). Bu sarmalayıcıya
          ayrı bir aria-label eklemek aynı Türkçe nokta'lı İ uyuşmazlığını bir
          seviye yukarı taşırdı. */}
      <section className="compact-brand-stage">
        <BrandHeader dataMode="live" href="/" />
      </section>
      <main className="waitlist-main">
        <section
          className="waitlist-workbench"
          aria-labelledby="waitlist-title"
        >
          <header className="waitlist-heading">
            <span className="waitlist-heading__mark" aria-hidden="true">
              <ListPlus weight="duotone" />
            </span>
            <div>
              <small>Bekleme listesi</small>
              <h1 id="waitlist-title">Uygun saat açıldığında ilk sen bil.</h1>
              <p>Tercihini bırak, açılan saati süre dolmadan talep et.</p>
            </div>
          </header>

          {message && (
            <div className="waitlist-notice" role="alert">
              <WarningCircle weight="fill" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          {loading ? (
            <WaitlistLoading />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={entry ? `entry-${entry.status}` : stage}
                className="waitlist-layout"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{
                  duration: reducedMotion ? 0 : 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {entry ? (
                  <EntryExperience
                    entry={entry}
                    offer={activeOffer}
                    busy={busy}
                    onAccept={() => void acceptOffer()}
                    onCancel={() => setCancelOpen(true)}
                  />
                ) : hasValidContext && !catalogError ? (
                  <>
                    <PreferenceSummary
                      services={chosenServices.map((item) => ({
                        name: item.name,
                        durationMinutes: item.durationMinutes,
                        priceKurus: item.priceKurus,
                      }))}
                      professionalName={
                        selectedProfessional?.name ?? "İlk müsait uzman"
                      }
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      startTime={startTime}
                      endTime={endTime}
                    />
                    <div className="waitlist-form-pane">
                      {stage === "form" ? (
                        <JoinForm
                          values={{
                            fullName,
                            phone,
                            dateFrom,
                            dateTo,
                            startTime,
                            endTime,
                            note,
                          }}
                          errors={fieldErrors}
                          noteOpen={noteOpen}
                          busy={busy}
                          onSubmit={requestCode}
                          onChange={{
                            fullName: setFullName,
                            phone: setPhone,
                            dateFrom: (value) => {
                              setDateFrom(value);
                              if (dateTo < value) setDateTo(value);
                            },
                            dateTo: setDateTo,
                            startTime: setStartTime,
                            endTime: setEndTime,
                            note: setNote,
                          }}
                          onToggleNote={() => setNoteOpen((value) => !value)}
                        />
                      ) : (
                        <OtpForm
                          phone={phone}
                          code={code}
                          developmentCode={developmentCode}
                          otpSeconds={otpSeconds}
                          resendSeconds={resendSeconds}
                          busy={busy}
                          onCode={setCode}
                          onSubmit={verify}
                          onEditPhone={() => {
                            setStage("form");
                            setChallengeId("");
                            setCode("");
                            setMessage("");
                          }}
                          onResend={() => void submitCodeRequest()}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <RecoveryState
                    catalogError={catalogError}
                    offerLinkError={offerLinkError}
                    onRetry={() => void loadCatalog()}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </main>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Bekleme listesinden ayrılmak istiyor musunuz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Aktif saat teklifiniz varsa kapanır. Bu işlem geri alınamaz; daha
              sonra yeniden tercih oluşturabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void cancelEntry()}
            >
              {busy ? "Kapatılıyor…" : "Kayıttan ayrıl"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PreferenceSummary({
  services,
  professionalName,
  dateFrom,
  dateTo,
  startTime,
  endTime,
}: {
  services: Array<{
    name: string;
    durationMinutes: number;
    priceKurus: number;
  }>;
  professionalName: string;
  dateFrom: string;
  dateTo: string;
  startTime: string;
  endTime: string;
}) {
  return (
    <aside className="waitlist-summary" aria-label="Bekleme tercihi özeti">
      <div className="waitlist-summary__eyebrow">
        <ShieldCheck weight="fill" /> Güvenli tercih
      </div>
      <h2>Aradığın randevu</h2>
      <dl>
        <div>
          <dt>Hizmet</dt>
          <dd>{services.map((item) => item.name).join(" · ")}</dd>
        </div>
        <div>
          <dt>Uzman</dt>
          <dd>{professionalName}</dd>
        </div>
        <div>
          <dt>Tarih</dt>
          <dd>{dateRangeLabel(dateFrom, dateTo)}</dd>
        </div>
        <div>
          <dt>Saat</dt>
          <dd>
            {startTime}–{endTime}
          </dd>
        </div>
      </dl>
      <div className="waitlist-summary__total">
        <span>
          <small>Toplam süre</small>
          <strong>
            {services.reduce((sum, item) => sum + item.durationMinutes, 0)} dk
          </strong>
        </span>
        <span>
          <small>Hizmet değeri</small>
          <strong>
            {formatCurrency(
              services.reduce((sum, item) => sum + item.priceKurus, 0),
            )}
          </strong>
        </span>
      </div>
      <p>
        Salon ekibi tercihlerine uyan bir boşluk seçerse SMS gönderir. Saati
        kabul edene kadar randevu kesinleşmez.
      </p>
    </aside>
  );
}

type JoinValues = {
  fullName: string;
  phone: string;
  dateFrom: string;
  dateTo: string;
  startTime: string;
  endTime: string;
  note: string;
};

function JoinForm({
  values,
  errors,
  noteOpen,
  busy,
  onSubmit,
  onChange,
  onToggleNote,
}: {
  values: JoinValues;
  errors: FieldErrors;
  noteOpen: boolean;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onChange: Record<keyof JoinValues, (value: string) => void>;
  onToggleNote: () => void;
}) {
  return (
    <form className="waitlist-form-v2" noValidate onSubmit={onSubmit}>
      <div className="waitlist-form-v2__heading">
        <small>1 / 2</small>
        <h2>İletişim ve tercih</h2>
        <p>Sana yalnız uygun bir saat açıldığında ulaşalım.</p>
      </div>
      <div className="waitlist-fields">
        <Field id="waitlist-full-name" label="Ad soyad" error={errors.fullName}>
          <Input
            id="waitlist-full-name"
            name="fullName"
            autoComplete="name"
            value={values.fullName}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={
              errors.fullName ? "waitlist-full-name-error" : undefined
            }
            onChange={(event) => onChange.fullName(event.target.value)}
          />
        </Field>
        <Field id="waitlist-phone" label="Cep telefonu" error={errors.phone}>
          <Input
            id="waitlist-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="05xx xxx xx xx"
            value={values.phone}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "waitlist-phone-error" : undefined}
            onChange={(event) => onChange.phone(event.target.value)}
          />
        </Field>
        <Field
          id="waitlist-date-from"
          label="Başlangıç tarihi"
          error={errors.dateFrom}
        >
          <Input
            id="waitlist-date-from"
            name="dateFrom"
            type="date"
            min={today()}
            value={values.dateFrom}
            aria-invalid={Boolean(errors.dateFrom)}
            aria-describedby={
              errors.dateFrom ? "waitlist-date-from-error" : undefined
            }
            onChange={(event) => onChange.dateFrom(event.target.value)}
          />
        </Field>
        <Field id="waitlist-date-to" label="Bitiş tarihi" error={errors.dateTo}>
          <Input
            id="waitlist-date-to"
            name="dateTo"
            type="date"
            min={values.dateFrom}
            value={values.dateTo}
            aria-invalid={Boolean(errors.dateTo)}
            aria-describedby={
              errors.dateTo ? "waitlist-date-to-error" : undefined
            }
            onChange={(event) => onChange.dateTo(event.target.value)}
          />
        </Field>
        <Field
          id="waitlist-start-time"
          label="En erken saat"
          error={errors.time}
        >
          <Input
            id="waitlist-start-time"
            name="startTime"
            type="time"
            value={values.startTime}
            aria-invalid={Boolean(errors.time)}
            aria-describedby={
              errors.time ? "waitlist-start-time-error" : undefined
            }
            onChange={(event) => onChange.startTime(event.target.value)}
          />
        </Field>
        <Field id="waitlist-end-time" label="En geç saat">
          <Input
            id="waitlist-end-time"
            name="endTime"
            type="time"
            value={values.endTime}
            aria-invalid={Boolean(errors.time)}
            onChange={(event) => onChange.endTime(event.target.value)}
          />
        </Field>
      </div>
      <Button
        className="waitlist-note-toggle"
        type="button"
        variant="ghost"
        aria-expanded={noteOpen}
        onClick={onToggleNote}
      >
        <NotePencil /> {noteOpen ? "Notu kapat" : "Not ekle"}
      </Button>
      {noteOpen && (
        <Field id="waitlist-note" label="Kısa not">
          <Textarea
            id="waitlist-note"
            name="note"
            maxLength={500}
            value={values.note}
            placeholder="Örn. öğleden sonra daha uygunum"
            onChange={(event) => onChange.note(event.target.value)}
          />
        </Field>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? (
          "Kod gönderiliyor…"
        ) : (
          <>
            Telefonumu doğrula <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="waitlist-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <small id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

function OtpForm({
  phone,
  code,
  developmentCode,
  otpSeconds,
  resendSeconds,
  busy,
  onCode,
  onSubmit,
  onEditPhone,
  onResend,
}: {
  phone: string;
  code: string;
  developmentCode: string;
  otpSeconds: number;
  resendSeconds: number;
  busy: boolean;
  onCode: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onEditPhone: () => void;
  onResend: () => void;
}) {
  return (
    <form className="waitlist-form-v2 waitlist-otp" onSubmit={onSubmit}>
      <div className="waitlist-form-v2__heading">
        <small>2 / 2</small>
        <h2>Telefonunu doğrula</h2>
        <p>
          <strong>{maskInputPhone(phone)}</strong> numarasına gelen 6 haneli
          kodu gir.
        </p>
      </div>
      <Field id="waitlist-code" label="Doğrulama kodu">
        <Input
          id="waitlist-code"
          name="verificationCode"
          className="waitlist-code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          maxLength={6}
          onChange={(event) =>
            onCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />
      </Field>
      <div className="waitlist-otp__time" aria-live="polite">
        <Clock />{" "}
        {otpSeconds > 0
          ? `Kod ${formatCountdown(otpSeconds)} geçerli`
          : "Kodun süresi doldu"}
      </div>
      {developmentCode && (
        <div className="access-dev-code">
          <span>Geliştirme kodu</span>
          <strong>{developmentCode}</strong>
          <small>Canlı ortamda gösterilmez.</small>
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={busy || code.length !== 6 || otpSeconds <= 0}
      >
        {busy ? "Doğrulanıyor…" : "Bekleme listesine katıl"}
      </Button>
      <div className="waitlist-otp__actions">
        <Button type="button" variant="ghost" onClick={onEditPhone}>
          Telefonu düzelt
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy || resendSeconds > 0}
          onClick={onResend}
        >
          {resendSeconds > 0
            ? `${resendSeconds} sn sonra yeniden gönder`
            : "Kodu yeniden gönder"}
        </Button>
      </div>
    </form>
  );
}

function EntryExperience({
  entry,
  offer,
  busy,
  onAccept,
  onCancel,
}: {
  entry: WaitlistEntry;
  offer: WaitlistOffer | OfferAccess | null;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const accepted =
    offer?.acceptedBooking ??
    entry.offers.find((item) => item.acceptedBooking)?.acceptedBooking;
  const terminal = entry.status === "CANCELLED" || entry.status === "EXPIRED";
  return (
    <>
      <aside className="waitlist-summary waitlist-summary--entry">
        <div className="waitlist-summary__eyebrow">
          <ShieldCheck weight="fill" /> {entry.phoneMasked}
        </div>
        <h2>{entry.fullName}</h2>
        <dl>
          <div>
            <dt>Hizmet</dt>
            <dd>{entry.services.map((item) => item.name).join(" · ")}</dd>
          </div>
          <div>
            <dt>Uzman</dt>
            <dd>{entry.professional?.name ?? "İlk müsait uzman"}</dd>
          </div>
          <div>
            <dt>Tarih</dt>
            <dd>{dateRangeLabel(entry.dateFrom, entry.dateTo)}</dd>
          </div>
          <div>
            <dt>Saat</dt>
            <dd>
              {minuteLabel(entry.startMinute)}–{minuteLabel(entry.endMinute)}
            </dd>
          </div>
        </dl>
        {entry.status !== "FULFILLED" && !terminal && (
          <Button variant="outline" onClick={onCancel}>
            Kayıttan ayrıl
          </Button>
        )}
      </aside>
      <section
        className={`waitlist-state is-${entry.status.toLowerCase()}`}
        aria-live="polite"
      >
        {entry.status === "ACTIVE" && (
          <>
            <StatusMark icon={<Clock weight="duotone" />} />
            <small>Kaydın aktif</small>
            <h2>Tercihlerin salon ekibine ulaştı.</h2>
            <p>
              Uygun bir boşluk açılırsa salon ekibi kaydını değerlendirir ve
              sana süreli bir kabul bağlantısı gönderir.
            </p>
            {entry.failedOfferCount > 0 && (
              <div className="waitlist-state__note">
                {entry.failedOfferCount} önceki teklifin süresi doldu; kaydın
                yeni saatler için aktif.
              </div>
            )}
          </>
        )}
        {entry.status === "OFFERED" && offer && (
          <OfferState offer={offer} busy={busy} onAccept={onAccept} />
        )}
        {entry.status === "FULFILLED" && (
          <>
            <StatusMark icon={<CheckCircle weight="fill" />} />
            <small>Randevun kesinleşti</small>
            <h2>Saatin senin için ayrıldı.</h2>
            <p>
              Salon ekibinin teklifini kabul ettin; ikinci bir onay adımı
              bulunmuyor.
            </p>
            {accepted && (
              <div className="waitlist-reference">
                <span>Randevu referansı</span>
                <strong>{accepted.publicCode}</strong>
              </div>
            )}
            <Button asChild variant="outline">
              <a href="/hesabim">Hesabımda görüntüle</a>
            </Button>
          </>
        )}
        {terminal && (
          <>
            <StatusMark icon={<WarningCircle weight="duotone" />} />
            <small>
              {entry.status === "CANCELLED"
                ? "Kayıt kapatıldı"
                : "Kayıt sona erdi"}
            </small>
            <h2>Bu tercih artık aktif değil.</h2>
            <p>
              Yeni tarih ve hizmet seçerek tekrar bekleme listesine
              katılabilirsin.
            </p>
            <Button asChild>
              <a href="/">
                Yeni seçim yap <ArrowRight />
              </a>
            </Button>
          </>
        )}
      </section>
    </>
  );
}

function OfferState({
  offer,
  busy,
  onAccept,
}: {
  offer: WaitlistOffer | OfferAccess;
  busy: boolean;
  onAccept: () => void;
}) {
  const [seconds, setSeconds] = useState(() => secondsUntil(offer.expiresAt));
  useEffect(() => {
    const timer = window.setInterval(
      () => setSeconds(secondsUntil(offer.expiresAt)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [offer.expiresAt]);
  return (
    <>
      <StatusMark icon={<CalendarClock weight="duotone" />} />
      <small>Salon ekibinden saat teklifi</small>
      <h2>{formatDateTime(offer.startAt)}</h2>
      <p>{offer.professional.name} ile bu randevuyu kesinleştirebilirsin.</p>
      <div className="waitlist-offer-facts">
        <span>
          <small>Süre</small>
          <strong>{offer.totalDurationMinutes} dk</strong>
        </span>
        <span>
          <small>Hizmet değeri</small>
          <strong>{formatCurrency(offer.totalPriceKurus)}</strong>
        </span>
        <span>
          <small>Kalan süre</small>
          <strong>
            {seconds > 0 ? formatCountdown(seconds) : "Süre doldu"}
          </strong>
        </span>
      </div>
      <Button size="lg" disabled={busy || seconds <= 0} onClick={onAccept}>
        {busy ? (
          "Randevu kesinleştiriliyor…"
        ) : (
          <>
            Bu saati kabul et <ArrowRight />
          </>
        )}
      </Button>
      <p className="waitlist-state__footnote">
        Kabul ettiğinde randevun doğrudan kesinleşir; yeniden onay beklemezsin.
      </p>
    </>
  );
}

function StatusMark({ icon }: { icon: ReactNode }) {
  return (
    <span className="waitlist-state__mark" aria-hidden="true">
      {icon}
    </span>
  );
}

function RecoveryState({
  catalogError,
  offerLinkError,
  onRetry,
}: {
  catalogError: string;
  offerLinkError: string;
  onRetry: () => void;
}) {
  const hasOfferError = Boolean(offerLinkError);
  return (
    <section className="waitlist-recovery">
      <StatusMark
        icon={
          catalogError || hasOfferError ? (
            <WarningCircle weight="duotone" />
          ) : (
            <CalendarClock weight="duotone" />
          )
        }
      />
      <small>
        {hasOfferError
          ? "Teklif kullanılamıyor"
          : catalogError
            ? "Bilgiler yüklenemedi"
            : "Önce tercihini belirle"}
      </small>
      <h2>
        {hasOfferError
          ? "Bu teklif artık açık değil."
          : catalogError
            ? "Salon kataloğuna ulaşamadık."
            : "Hizmet ve tarih seçimi eksik."}
      </h2>
      <p>
        {offerLinkError ||
          catalogError ||
          "Bekleme listesi, seçtiğin hizmete ve güne göre çalışır. Rezervasyon ekranından tercihini belirleyerek devam et."}
      </p>
      <div>
        {catalogError && (
          <Button variant="outline" onClick={onRetry}>
            Yeniden dene
          </Button>
        )}
        <Button asChild>
          <a href="/">
            Hizmet ve tarih seç <ArrowRight />
          </a>
        </Button>
      </div>
    </section>
  );
}

function WaitlistLoading() {
  return (
    <div className="waitlist-loading" aria-label="Bekleme listesi hazırlanıyor">
      <span />
      <span />
      <span />
      <strong>Bekleme listesi hazırlanıyor</strong>
    </div>
  );
}

class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  if (!response.ok)
    throw new ApiError(
      Array.isArray(body?.message)
        ? body.message[0]
        : (body?.message ?? "İşlem tamamlanamadı."),
      response.status,
    );
  return body as T;
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
function validPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^(?:90|0)?5\d{9}$/.test(digits);
}
function minuteValue(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
function dayDifference(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T12:00:00+03:00`).getTime() -
      new Date(`${from}T12:00:00+03:00`).getTime()) /
      86_400_000,
  );
}
function minuteLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00+03:00`));
}
function dateRangeLabel(from: string, to: string) {
  return from === to
    ? formatDate(from)
    : `${formatDate(from)} – ${formatDate(to)}`;
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value / 100);
}
function secondsUntil(value: string) {
  return Math.max(
    0,
    Math.floor((new Date(value).getTime() - Date.now()) / 1000),
  );
}
function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function maskInputPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10
    ? `+90 ${digits.slice(-10, -7)} *** ** ${digits.slice(-2)}`
    : value;
}
