import { ArrowLeftIcon as ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { BellIcon as Bell } from "@phosphor-icons/react/dist/csr/Bell";
import { CalendarBlankIcon as CalendarDays } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CalendarPlusIcon as CalendarPlus } from "@phosphor-icons/react/dist/csr/CalendarPlus";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CaretRightIcon as ChevronRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import { ClockCounterClockwiseIcon as History } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { SpinnerGapIcon as LoaderCircle } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { SignOutIcon as LogOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { MapPinIcon as MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { ChatCircleTextIcon as MessageSquareText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { PhoneIcon as Phone } from "@phosphor-icons/react/dist/csr/Phone";
import { ArrowsClockwiseIcon as RefreshCw } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { RepeatIcon as Repeat2 } from "@phosphor-icons/react/dist/csr/Repeat";
import { ScissorsIcon as Scissors } from "@phosphor-icons/react/dist/csr/Scissors";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { SparkleIcon as Sparkles } from "@phosphor-icons/react/dist/csr/Sparkle";
import { StarIcon as Star } from "@phosphor-icons/react/dist/csr/Star";
import { UserCircleIcon as UserRound } from "@phosphor-icons/react/dist/csr/UserCircle";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import { motion, useReducedMotion } from "framer-motion";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { StudioWordmark } from "../components/brand/StudioWordmark";
import { AnimatedLivingQRCode } from "../components/booking/AnimatedLivingQRCode";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { motionDurations, motionEase } from "../design-system/motion";
import {
  cancelCustomerBooking,
  cancelCustomerBookingSeries,
  createCustomerBookingSeries,
  createCustomerChangeRequest,
  CustomerAccountApiError,
  downloadCustomerCalendar,
  getCustomerBooking,
  getCustomerBookingSeries,
  getCustomerBookingAvailability,
  getCustomerBookings,
  getCustomerProfile,
  getCustomerReview,
  getCustomerSession,
  logoutCustomer,
  requestCustomerCode,
  previewCustomerBookingSeries,
  submitCustomerReview,
  updateCustomerProfile,
  verifyCustomerCode,
} from "./customerAccountApi";
import type {
  BookingChangeAvailability,
  CustomerBookingDetail,
  CustomerBookingStatus,
  CustomerBookingSummary,
  CustomerProfile,
  CustomerSession,
  BookingSeriesFrequency,
  BookingSeriesPreview,
  CustomerReview,
} from "./customerAccountTypes";
import "./customerAccount.css";
import "./customerAccountStudio.css";
import { CustomerBookingForms } from "./CustomerBookingForms";

type SessionState =
  | { kind: "checking" }
  | { kind: "guest" }
  | { kind: "authenticated"; session: CustomerSession };

const STATUS_COPY: Record<
  CustomerBookingStatus,
  { label: string; tone: string; message: string }
> = {
  HOLD: {
    label: "Saat ayrıldı",
    tone: "pending",
    message: "Rezervasyon işlemi henüz tamamlanmadı.",
  },
  PENDING_APPROVAL: {
    label: "Onay bekliyor",
    tone: "pending",
    message:
      "Randevu talebiniz salona iletildi. Onaylandığında size bilgi vereceğiz.",
  },
  CONFIRMED: {
    label: "Yaklaşan",
    tone: "success",
    message: "Randevunuz onaylandı. Sizi salonda bekliyoruz.",
  },
  REJECTED: {
    label: "Reddedildi",
    tone: "danger",
    message: "Randevu talebiniz salon tarafından onaylanamadı.",
  },
  CANCELLED: {
    label: "İptal edildi",
    tone: "danger",
    message: "Bu randevu iptal edildi.",
  },
  EXPIRED: {
    label: "Süresi doldu",
    tone: "muted",
    message:
      "Talebiniz randevu saatinden önce yanıtlanamadığı için süresi doldu.",
  },
};

function bookingPresentation(
  booking: Pick<
    CustomerBookingSummary,
    "status" | "visitStatus" | "startAt" | "endAt"
  >,
  now = Date.now(),
) {
  if (booking.visitStatus === "NO_SHOW") {
    return {
      label: "Gelmedi",
      tone: "danger",
      message:
        "Salon kaydına göre bu randevuya katılım sağlanmadı.",
    };
  }
  if (booking.status !== "CONFIRMED") return STATUS_COPY[booking.status];
  if (now < new Date(booking.startAt).getTime()) {
    return STATUS_COPY.CONFIRMED;
  }
  if (now < new Date(booking.endAt).getTime()) {
    return {
      label: "Randevu saati",
      tone: "success",
      message: "Randevu saatiniz geldi.",
    };
  }
  return {
    label: "Geçmiş",
    tone: "muted",
    message: "Randevu tarihi geçti.",
  };
}

export function CustomerAccountApp() {
  const [state, setState] = useState<SessionState>({ kind: "checking" });

  useEffect(() => {
    let active = true;
    getCustomerSession()
      .then((session) => {
        if (!active) return;
        setState(
          session.authenticated
            ? { kind: "authenticated", session }
            : { kind: "guest" },
        );
      })
      .catch(() => active && setState({ kind: "guest" }));
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === "checking") return <AccountRouteLoader />;
  if (state.kind === "guest") {
    return (
      <CustomerLogin
        onAuthenticated={(session) =>
          setState({ kind: "authenticated", session })
        }
      />
    );
  }

  return (
    <CustomerAccountShell
      session={state.session}
      onProfileUpdated={(customer) =>
        setState({
          kind: "authenticated",
          session: { ...state.session, customer },
        })
      }
      onLogout={async () => {
        await logoutCustomer().catch(() => undefined);
        setState({ kind: "guest" });
      }}
    />
  );
}

function CustomerLogin({
  onAuthenticated,
}: {
  onAuthenticated: (session: CustomerSession) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resendAt) return;
    const update = () =>
      setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Geçerli bir cep telefonu numarası yazmalısın.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await requestCustomerCode(phone);
      setChallengeId(result.challengeId);
      setDevelopmentCode(result.developmentCode ?? "");
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
    } catch (reason) {
      setError(friendlyError(reason, "Doğrulama kodu gönderilemedi."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError("6 haneli doğrulama kodunu yazmalısın.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onAuthenticated(await verifyCustomerCode(phone, challengeId, code));
    } catch (reason) {
      setError(friendlyError(reason, "Kod doğrulanamadı."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="customer-login-shell">
      <header className="customer-login-header">
        <Link to="/" aria-label="Randevu sayfasına dön">
          <StudioWordmark />
        </Link>
        <Link to="/">
          <ArrowLeft size={17} />
          Randevu oluştur
        </Link>
      </header>
      <main className="customer-login-main">
        <section className="customer-login-intro" aria-labelledby="customer-login-title">
          <p className="customer-eyebrow">Kişisel randevu merkezi</p>
          <h1 id="customer-login-title">Salon ziyaretlerin, tek bir güvenli akışta.</h1>
          <p>
            Bekleyen taleplerini, yaklaşan randevularını ve geçmiş
            ziyaretlerini telefon numaranla yönet.
          </p>
        </section>
        <motion.section
          className="customer-login-card"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionDurations.page, ease: motionEase }}
        >
          <span className="customer-login-icon">
            <ShieldCheck />
          </span>
          <p className="customer-eyebrow">Güvenli giriş</p>
          <h1>Telefonunla devam et.</h1>
          <p className="customer-login-lead">
            Telefonuna gelen tek kullanımlık kodla giriş yap.
          </p>
          {!challengeId ? (
            <form onSubmit={sendCode} className="customer-auth-form">
              <label>
                <span>Cep telefonu</span>
                <div className="customer-phone-field">
                  <b>+90</b>
                  <input
                    autoFocus
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="5xx xxx xx xx"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </label>
              {error && <AccountError message={error} />}
              <Button disabled={busy} type="submit">
                {busy ? <LoaderCircle className="is-spinning" /> : <Phone />}
                {busy ? "Gönderiliyor…" : "Giriş kodu gönder"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="customer-auth-form">
              <div className="customer-code-sent">
                <CheckCircle2 />
                <span>
                  <strong>Kod gönderildi</strong>
                  <small>{maskPhone(phone)}</small>
                </span>
              </div>
              <label>
                <span>6 haneli kod</span>
                <input
                  className="customer-code-input"
                  autoFocus
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              {developmentCode && (
                <p className="customer-dev-code">
                  Geliştirme kodu <strong>{developmentCode}</strong>
                </p>
              )}
              {error && <AccountError message={error} />}
              <Button disabled={busy || code.length !== 6} type="submit">
                {busy ? (
                  <LoaderCircle className="is-spinning" />
                ) : (
                  <ArrowRight />
                )}
                {busy ? "Doğrulanıyor…" : "Hesabımı aç"}
              </Button>
              <div className="customer-auth-secondary">
                <button
                  type="button"
                  onClick={() => {
                    setChallengeId("");
                    setCode("");
                    setError("");
                  }}
                >
                  Numarayı değiştir
                </button>
                <button
                  type="button"
                  disabled={busy || seconds > 0}
                  onClick={() => void sendCode()}
                >
                  {seconds
                    ? `${seconds} sn sonra gönder`
                    : "Kodu tekrar gönder"}
                </button>
              </div>
            </form>
          )}
          <p className="customer-auth-note">
            Ayrı bir kayıt veya şifre oluşturman gerekmez.
          </p>
        </motion.section>
      </main>
    </div>
  );
}

function CustomerAccountShell({
  session,
  onProfileUpdated,
  onLogout,
}: {
  session: CustomerSession;
  onProfileUpdated: (profile: CustomerProfile) => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="customer-account-shell">
      <a className="customer-skip-link" href="#customer-account-content">
        İçeriğe geç
      </a>
      <header className="customer-account-header">
        <Link className="customer-account-brand" to="/">
          <StudioWordmark />
        </Link>
        <nav aria-label="Müşteri hesabı">
          <NavLink end to="/hesabim">
            <CalendarDays />
            Randevularım
          </NavLink>
          <NavLink to="/hesabim/profil">
            <UserRound />
            Profilim
          </NavLink>
        </nav>
        <div className="customer-account-user">
          <Link className="customer-account-new-booking" to="/">
            <CalendarPlus />
            <span>Yeni randevu</span>
          </Link>
          <span>
            <small>Hoş geldin</small>
            <strong>{firstName(session.customer.fullName)}</strong>
          </span>
          <button
            type="button"
            aria-label="Müşteri hesabından çıkış yap"
            onClick={() => void onLogout()}
          >
            <LogOut />
            <span>Çıkış</span>
          </button>
        </div>
      </header>
      <main className="customer-account-main" id="customer-account-content">
        <Routes>
          <Route index element={<CustomerDashboard />} />
          <Route
            path="profil"
            element={
              <CustomerProfilePage
                customer={session.customer}
                onUpdated={onProfileUpdated}
              />
            }
          />
          <Route
            path="randevular/:publicCode"
            element={<CustomerBookingPage />}
          />
          <Route path="*" element={<Navigate to="/hesabim" replace />} />
        </Routes>
      </main>
      <nav className="customer-mobile-nav" aria-label="Müşteri hesabı mobil">
        <NavLink end to="/hesabim">
          <CalendarDays />
          <span>Randevular</span>
        </NavLink>
        <Link className="customer-mobile-nav__primary" to="/">
          <CalendarPlus />
          <span>Yeni randevu</span>
        </Link>
        <NavLink to="/hesabim/profil">
          <UserRound />
          <span>Profilim</span>
        </NavLink>
      </nav>
      <footer className="customer-account-footer">
        <span>© {new Date().getFullYear()} Ramazan İnanç Hair Art Studio</span>
        <Link to="/">Yeni randevu oluştur</Link>
      </footer>
    </div>
  );
}

type CustomerBookingView = "pending" | "upcoming" | "history";
type CustomerBookingGroups = Record<
  CustomerBookingView,
  CustomerBookingSummary[]
>;
type CustomerBookingCursors = Record<CustomerBookingView, string | null>;
type CustomerBookingLoading = Record<CustomerBookingView, boolean>;
type CustomerBookingErrors = Record<CustomerBookingView, string>;

const HISTORY_REVEAL_SIZE = 5;
const EMPTY_BOOKING_GROUPS: CustomerBookingGroups = {
  pending: [],
  upcoming: [],
  history: [],
};
const EMPTY_BOOKING_CURSORS: CustomerBookingCursors = {
  pending: null,
  upcoming: null,
  history: null,
};
const INITIAL_BOOKING_LOADING: CustomerBookingLoading = {
  pending: true,
  upcoming: true,
  history: true,
};
const EMPTY_BOOKING_ERRORS: CustomerBookingErrors = {
  pending: "",
  upcoming: "",
  history: "",
};

function CustomerDashboard() {
  const reduceMotion = useReducedMotion();
  const [groups, setGroups] = useState<CustomerBookingGroups>(
    EMPTY_BOOKING_GROUPS,
  );
  const [cursors, setCursors] = useState<CustomerBookingCursors>(
    EMPTY_BOOKING_CURSORS,
  );
  const [loading, setLoading] = useState<CustomerBookingLoading>(
    INITIAL_BOOKING_LOADING,
  );
  const [errors, setErrors] =
    useState<CustomerBookingErrors>(EMPTY_BOOKING_ERRORS);
  const [historyVisibleCount, setHistoryVisibleCount] =
    useState(HISTORY_REVEAL_SIZE);

  const loadView = useCallback(
    async (
      view: CustomerBookingView,
      cursor?: string,
      append = false,
      signal?: AbortSignal,
    ) => {
      setLoading((current) => ({ ...current, [view]: true }));
      setErrors((current) => ({ ...current, [view]: "" }));
      try {
        const page = await getCustomerBookings(view, cursor, signal);
        if (signal?.aborted) return false;
        setGroups((current) => ({
          ...current,
          [view]: append
            ? deduplicateBookings([...current[view], ...page.items])
            : page.items,
        }));
        setCursors((current) => ({
          ...current,
          [view]: page.nextCursor,
        }));
        return true;
      } catch (reason) {
        if (signal?.aborted || isAbortError(reason)) return false;
        setErrors((current) => ({
          ...current,
          [view]: friendlyError(reason, "Randevuların yüklenemedi."),
        }));
        return false;
      } finally {
        if (!signal?.aborted) {
          setLoading((current) => ({ ...current, [view]: false }));
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadView("pending", undefined, false, controller.signal);
    void loadView("upcoming", undefined, false, controller.signal);
    void loadView("history", undefined, false, controller.signal);
    return () => controller.abort();
  }, [loadView]);

  const visibleHistory = groups.history.slice(0, historyVisibleCount);
  const hasHiddenHistory = historyVisibleCount < groups.history.length;
  const hasMoreHistory = hasHiddenHistory || Boolean(cursors.history);

  const showMoreHistory = async () => {
    if (hasHiddenHistory) {
      setHistoryVisibleCount((current) => current + HISTORY_REVEAL_SIZE);
      return;
    }
    if (!cursors.history || loading.history) return;
    const loaded = await loadView("history", cursors.history, true);
    if (loaded) {
      setHistoryVisibleCount((current) => current + HISTORY_REVEAL_SIZE);
    }
  };

  return (
    <>
      <section className="customer-page-heading">
        <span>
          <p className="customer-eyebrow">Kişisel randevu merkezi</p>
          <h1>Randevularım</h1>
          <p>Bekleyen taleplerini ve yaklaşan ziyaretlerini buradan yönet.</p>
        </span>
      </section>
      <motion.div
        className={`customer-booking-groups ${
          groups.pending.length ? "has-pending" : ""
        }`}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDurations.page, ease: motionEase }}
      >
        <BookingGroup
          eyebrow="İşlem bekleyen"
          title="Salon onayındaki talepler"
          icon={<Clock3 />}
          bookings={groups.pending}
          loadedCount={groups.pending.length}
          hasMore={Boolean(cursors.pending)}
          empty="Şu anda onay bekleyen bir talebin yok."
          tone="pending"
          loading={loading.pending}
          error={errors.pending}
          onRetry={() => void loadView("pending")}
        />
        <BookingGroup
          eyebrow="Yaklaşan"
          title="Sıradaki ziyaretlerin"
          icon={<CalendarDays />}
          bookings={groups.upcoming}
          loadedCount={groups.upcoming.length}
          hasMore={Boolean(cursors.upcoming)}
          empty="Yaklaşan bir randevun bulunmuyor."
          tone="upcoming"
          loading={loading.upcoming}
          error={errors.upcoming}
          onRetry={() => void loadView("upcoming")}
        />
        <BookingGroup
          eyebrow="Geçmiş"
          title="Randevu geçmişi"
          icon={<History />}
          bookings={visibleHistory}
          loadedCount={groups.history.length}
          hasMore={Boolean(cursors.history)}
          empty="Randevu geçmişin burada oluşacak."
          compact
          tone="history"
          loading={loading.history}
          error={errors.history}
          onRetry={() => void loadView("history")}
          footer={
            hasMoreHistory ? (
              <div className="customer-history-actions">
                <button
                  className="customer-history-more"
                  type="button"
                  disabled={loading.history}
                  onClick={() => void showMoreHistory()}
                >
                  {loading.history ? (
                    <LoaderCircle className="is-spinning" />
                  ) : (
                    <History />
                  )}
                  {loading.history
                    ? "Geçmiş yükleniyor…"
                    : hasHiddenHistory
                      ? `${Math.min(
                          HISTORY_REVEAL_SIZE,
                          groups.history.length - historyVisibleCount,
                        )} randevu daha göster`
                      : "Daha fazla geçmiş yükle"}
                </button>
                <small aria-live="polite">
                  {visibleHistory.length} randevu gösteriliyor
                </small>
              </div>
            ) : undefined
          }
        />
      </motion.div>
    </>
  );
}

function BookingGroup({
  eyebrow,
  title,
  icon,
  bookings,
  loadedCount,
  hasMore,
  empty,
  compact = false,
  tone,
  loading,
  error,
  onRetry,
  footer,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  bookings: CustomerBookingSummary[];
  loadedCount: number;
  hasMore: boolean;
  empty: string;
  compact?: boolean;
  tone: "upcoming" | "pending" | "history";
  loading: boolean;
  error: string;
  onRetry: () => void;
  footer?: React.ReactNode;
}) {
  const titleId = `customer-booking-group-${tone}`;
  return (
    <section
      className={`customer-booking-group customer-booking-group--${tone}`}
      aria-labelledby={titleId}
    >
      <header>
        <span className="customer-group-icon">{icon}</span>
        <span>
          <small>{eyebrow}</small>
          <h2 id={titleId}>{title}</h2>
        </span>
        <b
          aria-label={`${loadedCount}${hasMore ? " veya daha fazla" : ""} randevu`}
        >
          {loadedCount}
          {hasMore ? "+" : ""}
        </b>
      </header>
      {loading && !bookings.length ? (
        <div
          className="customer-booking-group-loading"
          role="status"
          aria-label={`${title} yükleniyor`}
        >
          <i />
          <i />
          <i />
        </div>
      ) : error && !bookings.length ? (
        <div className="customer-booking-group-error" role="alert">
          <XCircle />
          <span>
            <strong>Bu bölüm yüklenemedi</strong>
            <small>{error}</small>
          </span>
          <button type="button" onClick={onRetry}>
            <RefreshCw />
            Yenile
          </button>
        </div>
      ) : bookings.length ? (
        <div className={`customer-booking-list ${compact ? "is-compact" : ""}`}>
          {bookings.map((booking) => (
            <CustomerBookingCard
              booking={booking}
              compact={compact}
              key={booking.id}
            />
          ))}
        </div>
      ) : (
        <div className="customer-empty-row">
          <CheckCircle2 />
          <span>{empty}</span>
        </div>
      )}
      {error && bookings.length > 0 && (
        <div className="customer-booking-inline-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Yenile
          </button>
        </div>
      )}
      {footer}
    </section>
  );
}

function CustomerBookingCard({
  booking,
  compact = false,
}: {
  booking: CustomerBookingSummary;
  compact?: boolean;
}) {
  const status = bookingPresentation(booking);
  return (
    <Link
      className={`customer-booking-card ${
        compact ? "customer-booking-card--history" : ""
      }`}
      to={`/hesabim/randevular/${booking.publicCode}`}
    >
      <span className="customer-booking-date">
        <strong>{day(booking.startAt)}</strong>
        <small>{month(booking.startAt)}</small>
      </span>
      <span className="customer-booking-copy">
        <span>
          <b className={`customer-status customer-status--${status.tone}`}>
            {status.label}
          </b>
          <small>{booking.publicCode}</small>
        </span>
        <strong>
          {booking.items.map((item) => item.serviceName).join(" + ")}
        </strong>
        <small>
          {formatTime(booking.startAt)} · {booking.professional.name}
        </small>
        {booking.activeChangeRequest && (
          <em>Değişiklik talebin değerlendiriliyor</em>
        )}
      </span>
      <span className="customer-booking-price">
        <strong>{formatMoney(booking.totalPriceKurus)}</strong>
        <small>{booking.totalDurationMinutes} dk</small>
      </span>
      <ChevronRight className="customer-booking-arrow" />
    </Link>
  );
}

function CustomerProfilePage({
  customer,
  onUpdated,
}: {
  customer: CustomerProfile;
  onUpdated: (profile: CustomerProfile) => void;
}) {
  const [profile, setProfile] = useState(customer);
  const [savedProfile, setSavedProfile] = useState(customer);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileLoadError("");
    try {
      const current = await getCustomerProfile();
      setProfile(current);
      setSavedProfile(current);
      setSaved(false);
    } catch (reason) {
      setProfileLoadError(
        friendlyError(reason, "Profil bilgilerin yenilenemedi."),
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const dirty =
    profile.fullName !== savedProfile.fullName ||
    (profile.email ?? "") !== (savedProfile.email ?? "") ||
    profile.smsNotificationsEnabled !==
      savedProfile.smsNotificationsEnabled;

  const editProfile = (
    patch: Partial<
      Pick<CustomerProfile, "fullName" | "email" | "smsNotificationsEnabled">
    >,
  ) => {
    setProfile((current) => ({ ...current, ...patch }));
    setSaved(false);
    setError("");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const updated = await updateCustomerProfile({
        fullName: profile.fullName,
        email: profile.email,
        smsNotificationsEnabled: profile.smsNotificationsEnabled,
      });
      setProfile(updated);
      setSavedProfile(updated);
      onUpdated(updated);
      setSaved(true);
    } catch (reason) {
      setError(friendlyError(reason, "Profilin kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="customer-page-heading">
        <span>
          <p className="customer-eyebrow">Hesap bilgileri</p>
          <h1>Profilim</h1>
          <p>İletişim bilgilerini ve randevu SMS tercihini yönet.</p>
        </span>
      </section>
      <form
        className={`customer-profile-card customer-profile-card--studio ${
          dirty ? "is-dirty" : ""
        }`}
        onSubmit={save}
      >
        <header>
          <span className="customer-profile-avatar">
            {initials(profile.fullName)}
          </span>
          <span>
            <h2>{profile.fullName}</h2>
            <p>
              {profileLoading
                ? "Hesap bilgileri yenileniyor…"
                : "Telefonla doğrulanmış müşteri hesabı"}
            </p>
            {!profileLoading && (
              <small className="customer-profile-verification">
                <CheckCircle2 />
                Telefon doğrulandı
              </small>
            )}
          </span>
          <ShieldCheck />
        </header>
        {profileLoadError && (
          <section className="customer-profile-load-error" role="alert">
            <XCircle />
            <span>
              <strong>Güncel bilgiler alınamadı</strong>
              <small>{profileLoadError}</small>
            </span>
            <button
              type="button"
              disabled={profileLoading}
              onClick={() => void loadProfile()}
            >
              <RefreshCw className={profileLoading ? "is-spinning" : ""} />
              Yenile
            </button>
          </section>
        )}
        <div className="customer-profile-fields customer-profile-sections">
          <section className="customer-profile-section">
            <header>
              <span>
                <small>Kimlik ve iletişim</small>
                <h3>Temel bilgilerin</h3>
              </span>
              <UserRound />
            </header>
            <div className="customer-profile-form-grid">
              <label>
                <span>Ad soyad</span>
                <input
                  value={profile.fullName}
                  onChange={(event) =>
                    editProfile({ fullName: event.target.value })
                  }
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  disabled={profileLoading}
                  required
                />
              </label>
              <label>
                <span>
                  E-posta <small>isteğe bağlı</small>
                </span>
                <input
                  type="email"
                  value={profile.email ?? ""}
                  onChange={(event) =>
                    editProfile({ email: event.target.value })
                  }
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  disabled={profileLoading}
                />
              </label>
              <div className="customer-profile-field">
                <span className="customer-profile-label">
                  Doğrulanmış telefon
                </span>
                <div className="customer-readonly-field">
                  <Phone />
                  <strong>{formatPhone(profile.phone)}</strong>
                  <small>Değişiklik için salonla iletişime geç</small>
                </div>
              </div>
            </div>
          </section>
          <section className="customer-profile-section customer-profile-section--notifications">
            <header>
              <span>
                <small>Bildirim tercihleri</small>
                <h3>Randevu iletişimi</h3>
              </span>
              <Bell />
            </header>
            <label className="customer-notification-toggle">
              <input
                type="checkbox"
                checked={profile.smsNotificationsEnabled}
                disabled={profileLoading}
                onChange={(event) =>
                  editProfile({
                    smsNotificationsEnabled: event.target.checked,
                  })
                }
              />
              <span>
                <Bell />
                <span>
                  <strong>Randevu SMS’leri</strong>
                  <small>
                    Onay, değişiklik ve hatırlatma mesajlarını telefonuma
                    gönder.
                  </small>
                </span>
              </span>
            </label>
            <p>
              Tercihin, bundan sonra oluşturulan ve yaklaşan randevuların
              bilgilendirme akışına uygulanır.
            </p>
          </section>
        </div>
        {error && <AccountError message={error} />}
        <footer className="customer-profile-actions">
          <span className="customer-profile-save-state" aria-live="polite">
            {saved ? (
              <>
                <CheckCircle2 />
                Değişikliklerin kaydedildi.
              </>
            ) : dirty ? (
              <>
                <Clock3 />
                Kaydedilmemiş değişikliklerin var.
              </>
            ) : (
              <>
                <ShieldCheck />
                Bilgilerin güncel.
              </>
            )}
          </span>
          <Button
            disabled={busy || profileLoading || !dirty}
            type="submit"
          >
            {busy ? <LoaderCircle className="is-spinning" /> : <CheckCircle2 />}
            {busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
          </Button>
        </footer>
      </form>
    </>
  );
}

function CustomerBookingPage() {
  const { publicCode = "" } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<CustomerBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBooking(await getCustomerBooking(publicCode));
    } catch (reason) {
      setError(friendlyError(reason, "Randevu bilgisi yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [publicCode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!booking?.reviewEligible || booking.reviewSubmitted) return;
    const wait = new Date(booking.reviewAvailableAt).getTime() - Date.now();
    if (wait <= 0) return;
    const timer = window.setTimeout(
      () => setClock(Date.now()),
      Math.min(wait + 250, 2_147_000_000),
    );
    return () => window.clearTimeout(timer);
  }, [booking, clock]);

  if (loading) return <CustomerDashboardSkeleton />;
  if (!booking) {
    return (
      <section className="customer-not-found">
        <XCircle />
        <h1>Randevu bulunamadı</h1>
        <p>{error || "Bu randevu hesabınla eşleşmiyor."}</p>
        <Button onClick={() => navigate("/hesabim")}>Randevularıma dön</Button>
      </section>
    );
  }

  const status = bookingPresentation(booking, clock);
  const reviewReady =
    booking.reviewEligible &&
    clock >= new Date(booking.reviewAvailableAt).getTime();
  return (
    <>
      <button
        className="customer-back-button"
        type="button"
        onClick={() => navigate("/hesabim")}
      >
        <ArrowLeft />
        Randevularıma dön
      </button>
      <section
        className={`customer-booking-hero customer-booking-hero--${status.tone}`}
      >
        <span className="customer-booking-hero__icon">
          {booking.status === "CONFIRMED" ? <CheckCircle2 /> : <Clock3 />}
        </span>
        <span>
          <p className="customer-eyebrow">{booking.publicCode}</p>
          <h1>{status.label}</h1>
          <p>{status.message}</p>
        </span>
        {reviewReady && !booking.reviewSubmitted && (
          <a className="customer-review-cta" href="#degerlendirme">
            <Star weight="fill" />
            Deneyimini değerlendir
          </a>
        )}
        {booking.reviewEligible &&
          !reviewReady &&
          !booking.reviewSubmitted && (
            <span className="customer-review-availability-note">
              Randevunuzdan sonra değerlendirebilirsiniz.
            </span>
          )}
        <strong>{formatMoney(booking.totalPriceKurus)}</strong>
      </section>
      {error && <AccountError message={error} />}
      <div className="customer-detail-layout">
        <div className="customer-detail-main">
          <section className="customer-detail-card customer-appointment-card">
            <header>
              <CalendarDays />
              <span>
                <small>Randevu zamanı</small>
                <h2>{formatLongDate(booking.startAt)}</h2>
              </span>
            </header>
            <div className="customer-appointment-time">
              <strong>{formatTime(booking.startAt)}</strong>
              <span />
              <strong>{formatTime(booking.endAt)}</strong>
              <small>{booking.totalDurationMinutes} dakika</small>
            </div>
            <div className="customer-detail-person">
              <span>{initials(booking.professional.name)}</span>
              <span>
                <small>Uzmanın</small>
                <strong>{booking.professional.name}</strong>
                <p>{booking.professional.title}</p>
              </span>
            </div>
          </section>
          <section className="customer-detail-card">
            <header>
              <Scissors />
              <span>
                <small>Seçtiklerin</small>
                <h2>Hizmetler</h2>
              </span>
            </header>
            <div className="customer-service-list">
              {booking.items.map((item) => (
                <div key={item.id}>
                  <span>
                    <strong>{item.serviceName}</strong>
                    <small>{item.durationMinutes} dakika</small>
                  </span>
                  <b>{formatMoney(item.priceKurus)}</b>
                </div>
              ))}
            </div>
          </section>
          {["PENDING_APPROVAL", "CONFIRMED"].includes(booking.status) &&
            booking.items.some((item) => item.preVisitInstructions) && (
              <section className="customer-detail-card customer-instructions-card">
                <header>
                  <ShieldCheck />
                  <span>
                    <small>
                      {booking.status === "PENDING_APPROVAL"
                        ? "Talep onaylandığında"
                        : "Hazırlık"}
                    </small>
                    <h2>Randevu öncesi</h2>
                  </span>
                </header>
                {booking.items
                  .filter((item) => item.preVisitInstructions)
                  .map((item) => (
                    <p key={item.id}>{item.preVisitInstructions}</p>
                  ))}
              </section>
            )}
          {booking.status === "CONFIRMED" &&
            booking.visitStatus !== "NO_SHOW" &&
            new Date(booking.endAt).getTime() <= clock &&
            booking.items.some((item) => item.postVisitInstructions) && (
              <section className="customer-detail-card customer-instructions-card">
                <header>
                  <Sparkles />
                  <span>
                    <small>Bakım notu</small>
                    <h2>İşlem sonrası bakım</h2>
                  </span>
                </header>
                {booking.items
                  .filter((item) => item.postVisitInstructions)
                  .map((item) => (
                    <p key={item.id}>{item.postVisitInstructions}</p>
                  ))}
              </section>
            )}
          <CustomerBookingForms publicCode={booking.publicCode} />
          {(reviewReady || booking.reviewSubmitted) && (
            <CustomerReviewPanel booking={booking} />
          )}
          {booking.changeRequests.length > 0 && (
            <section className="customer-detail-card">
              <header>
                <History />
                <span>
                  <small>Son hareketler</small>
                  <h2>Değişiklik talepleri</h2>
                </span>
              </header>
              <div className="customer-history-list">
                {booking.changeRequests.map((request) => (
                  <div key={request.id}>
                    <span
                      className={`customer-history-dot is-${request.status.toLowerCase()}`}
                    />
                    <span>
                      <strong>{changeStatusLabel(request.status)}</strong>
                      <small>
                        {formatLongDate(request.requestedStartAt)} ·{" "}
                        {formatTime(request.requestedStartAt)}
                      </small>
                      <p>{request.requestedProfessional.name}</p>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="customer-detail-side">
          {(booking.status === "CONFIRMED" ||
            booking.status === "PENDING_APPROVAL") && (
            <AnimatedLivingQRCode
              compact
              value={`${window.location.origin}/hesabim/randevular/${encodeURIComponent(booking.publicCode)}`}
              code={booking.publicCode}
              statusLabel={
                booking.status === "CONFIRMED"
                  ? "Randevu doğrulandı"
                  : "Onay süreci canlı"
              }
            />
          )}
          <section className="customer-detail-card customer-location-card">
            <header>
              <MapPin />
              <span>
                <small>Salon</small>
                <h2>{booking.branch.name}</h2>
              </span>
            </header>
            <p>{booking.branch.address || "Denizli"}</p>
            <strong>
              Randevundan {booking.branch.arrivalLeadMinutes} dakika önce
              gelmeni rica ediyoruz.
            </strong>
          </section>
          <section className="customer-detail-card customer-actions-card">
            <h2>Randevunu yönet</h2>
            {booking.status === "CONFIRMED" && (
              <button
                type="button"
                onClick={() =>
                  void downloadCustomerCalendar(booking.publicCode).catch(
                    (reason) =>
                      setError(
                        friendlyError(reason, "Takvim dosyası indirilemedi."),
                      ),
                  )
                }
              >
                <CalendarPlus />
                Takvimime ekle
                <ChevronRight />
              </button>
            )}
            {booking.status === "CONFIRMED" &&
              new Date(booking.startAt) > new Date() &&
              !booking.seriesId &&
              booking.items.length === 1 && (
                <button type="button" onClick={() => setSeriesOpen(true)}>
                  <Repeat2 />
                  Düzenli randevu oluştur
                  <ChevronRight />
                </button>
              )}
            {booking.seriesId && (
              <SeriesOverview booking={booking} onUpdated={() => void load()} />
            )}
            {booking.canRequestChange && (
              <button type="button" onClick={() => setChangeOpen(true)}>
                <Clock3 />
                Tarih veya saat değiştir
                <ChevronRight />
              </button>
            )}
            {booking.canCancel && (
              <button
                className="is-danger"
                type="button"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle />
                Randevuyu iptal et
                <ChevronRight />
              </button>
            )}
            {(new Date(booking.endAt) <= new Date() ||
               booking.status === "CANCELLED" ||
              booking.status === "REJECTED" ||
              booking.status === "EXPIRED" ||
              booking.visitStatus === "NO_SHOW") && (
              <button
                type="button"
                onClick={() =>
                  window.location.assign(
                    `/?rebook=${encodeURIComponent(booking.publicCode)}`,
                  )
                }
              >
                <CalendarPlus />
                Aynı hizmeti yeniden planla
                <ChevronRight />
              </button>
            )}
          </section>
          <section className="customer-detail-card customer-notification-card">
            <header>
              <MessageSquareText />
              <span>
                <small>Bilgilendirmeler</small>
                <h2>SMS hareketleri</h2>
              </span>
            </header>
            {booking.notifications.length ? (
              booking.notifications.slice(0, 5).map((notification) => (
                <div key={notification.id}>
                  <span />
                  <p>
                    <strong>{notificationLabel(notification.eventType)}</strong>
                    <small>
                      {formatLongDate(notification.createdAt)} ·{" "}
                      {formatTime(notification.createdAt)}
                    </small>
                  </p>
                </div>
              ))
            ) : (
              <p>Henüz SMS hareketi bulunmuyor.</p>
            )}
          </section>
        </aside>
      </div>
      <CancelBookingDialog
        booking={booking}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCompleted={() => {
          setCancelOpen(false);
          void load();
        }}
      />
      <ChangeBookingDialog
        booking={booking}
        open={changeOpen}
        onOpenChange={setChangeOpen}
        onCompleted={() => {
          setChangeOpen(false);
          void load();
        }}
      />
      <CreateSeriesDialog
        booking={booking}
        open={seriesOpen}
        onOpenChange={setSeriesOpen}
        onCompleted={() => {
          setSeriesOpen(false);
          void load();
        }}
      />
    </>
  );
}

function CustomerReviewPanel({ booking }: { booking: CustomerBookingDetail }) {
  const [review, setReview] = useState<CustomerReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCustomerReview(booking.publicCode)
      .then((value) => {
        if (!active) return;
        setReview(value);
        setRating(value.rating ?? 0);
        setComment(value.comment ?? "");
      })
      .catch(
        (reason: unknown) =>
          active &&
          setError(friendlyError(reason, "Değerlendirme alanı açılamadı.")),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [booking.publicCode]);

  if (loading) {
    return (
      <section
        id="degerlendirme"
        className="customer-detail-card customer-review-panel is-loading"
      >
        <LoaderCircle className="is-spinning" /> Değerlendirme alanı
        hazırlanıyor
      </section>
    );
  }
  if (error && !review) return null;
  if (review?.submittedAt) {
    return (
      <section
        id="degerlendirme"
        className="customer-detail-card customer-review-panel is-complete"
      >
        <header>
          <CheckCircle2 />
          <span>
            <small>Geri bildirimin alındı</small>
            <h2>Teşekkür ederiz</h2>
          </span>
        </header>
        <div
          className="customer-review-stars"
          aria-label={`${review.rating} yıldız`}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              fill={value <= (review.rating ?? 0) ? "currentColor" : "none"}
            />
          ))}
        </div>
        {review.comment && <p>{review.comment}</p>}
        {googleUrl && (
          <a href={googleUrl} target="_blank" rel="noreferrer">
            Google’da da değerlendir
          </a>
        )}
      </section>
    );
  }

  return (
    <section
      id="degerlendirme"
      className="customer-detail-card customer-review-panel"
    >
      <header>
        <Star />
        <span>
          <small>Doğrulanmış randevu</small>
          <h2>Deneyimini değerlendir</h2>
        </span>
      </header>
      <p className="customer-review-professional">
        <span>Değerlendirilen uzman</span>
        <strong>{review?.professional.name}</strong>
      </p>
      <div className="customer-review-stars is-editable">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            key={value}
            className={value <= rating ? "is-active" : ""}
            onClick={() => setRating(value)}
            aria-label={`${value} yıldız`}
          >
            <Star fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <label>
        Kısa yorum <span>İsteğe bağlı</span>
        <textarea
          maxLength={600}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Hizmet ve salon deneyimin…"
        />
      </label>
      {error && <AccountError message={error} />}
      <Button
        disabled={busy || !rating}
        onClick={() => {
          setBusy(true);
          setError("");
          void submitCustomerReview(booking.publicCode, {
            rating,
            comment: comment.trim() || undefined,
          })
            .then((response) => {
              setReview(response.review);
              setGoogleUrl(response.googleReviewUrl);
            })
            .catch((reason: unknown) =>
              setError(friendlyError(reason, "Değerlendirmen gönderilemedi.")),
            )
            .finally(() => setBusy(false));
        }}
      >
        {busy ? <LoaderCircle className="is-spinning" /> : <Star />}
        {busy ? "Gönderiliyor…" : "Değerlendirmeyi gönder"}
      </Button>
    </section>
  );
}

function CreateSeriesDialog({
  booking,
  open,
  onOpenChange,
  onCompleted,
}: {
  booking: CustomerBookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const [frequency, setFrequency] = useState<BookingSeriesFrequency>("WEEKLY");
  const [count, setCount] = useState(4);
  const [startDate, setStartDate] = useState(() =>
    nextDate(booking.startAt, 7),
  );
  const [preview, setPreview] = useState<BookingSeriesPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const service = booking.items[0];
  const startTime = formatTime(booking.startAt);

  useEffect(() => {
    if (!open) return;
    const days =
      frequency === "WEEKLY"
        ? 7
        : frequency === "BIWEEKLY"
          ? 14
          : frequency === "FOUR_WEEKLY"
            ? 28
            : 30;
    setStartDate(nextDate(booking.startAt, days));
    setPreview(null);
    setError("");
  }, [booking.startAt, frequency, open]);

  const input = {
    professionalId: booking.professional.id,
    serviceId: service?.serviceId ?? "",
    startDate,
    startTime,
    frequency,
    occurrenceCount: count,
  };

  const previewSeries = async () => {
    setBusy(true);
    setError("");
    try {
      setPreview(await previewCustomerBookingSeries(input));
    } catch (reason) {
      setError(friendlyError(reason, "Seri önizlemesi hazırlanamadı."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="customer-action-dialog customer-series-dialog">
        <DialogHeader>
          <DialogTitle>Düzenli randevu oluştur</DialogTitle>
          <DialogDescription>
            {booking.professional.name} ile {service?.serviceName} için tüm
            tarihleri oluşturmadan önce kontrol et.
          </DialogDescription>
        </DialogHeader>
        <div className="customer-series-fields">
          <label>
            Sıklık
            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as BookingSeriesFrequency)
              }
            >
              <option value="WEEKLY">Her hafta</option>
              <option value="BIWEEKLY">İki haftada bir</option>
              <option value="FOUR_WEEKLY">Dört haftada bir</option>
              <option value="MONTHLY">Her ay</option>
            </select>
          </label>
          <label>
            İlk yeni tarih
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPreview(null);
              }}
            />
          </label>
          <label>
            Randevu sayısı
            <input
              type="number"
              min={2}
              max={12}
              value={count}
              onChange={(event) => {
                setCount(Math.min(12, Math.max(2, Number(event.target.value))));
                setPreview(null);
              }}
            />
          </label>
          <label>
            Saat
            <input type="time" value={startTime} disabled />
          </label>
        </div>
        {preview && (
          <div className="customer-series-preview">
            {preview.occurrences.map((item) => (
              <span
                key={item.index}
                className={item.available ? "is-available" : "is-conflict"}
              >
                <b>{item.index}</b>
                <span>
                  <strong>{formatSeriesDate(item.date)}</strong>
                  <small>
                    {item.startTime} · {item.available ? "Uygun" : item.message}
                  </small>
                </span>
                {item.available ? <CheckCircle2 /> : <XCircle />}
              </span>
            ))}
          </div>
        )}
        {error && <AccountError message={error} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          {!preview ? (
            <Button
              disabled={busy || !service?.serviceId}
              onClick={() => void previewSeries()}
            >
              {busy ? (
                <LoaderCircle className="is-spinning" />
              ) : (
                <CalendarDays />
              )}
              Tarihleri kontrol et
            </Button>
          ) : (
            <Button
              disabled={busy || !preview.canCreate}
              onClick={() => {
                setBusy(true);
                setError("");
                void createCustomerBookingSeries({
                  ...input,
                  idempotencyKey: crypto.randomUUID(),
                })
                  .then(onCompleted)
                  .catch((reason: unknown) =>
                    setError(
                      friendlyError(reason, "Randevu serisi oluşturulamadı."),
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? <LoaderCircle className="is-spinning" /> : <Repeat2 />}
              {preview.canCreate
                ? "Seriyi oluştur"
                : "Çakışan tarihleri düzelt"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SeriesOverview({
  booking,
  onUpdated,
}: {
  booking: CustomerBookingDetail;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<Awaited<
    ReturnType<typeof getCustomerBookingSeries>
  > | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const occurrenceIndex = booking.occurrenceIndex;

  const load = async () => {
    if (!booking.seriesId) return;
    setBusy(true);
    setError("");
    try {
      setSeries(await getCustomerBookingSeries(booking.seriesId));
      setOpen(true);
    } catch (reason) {
      setError(friendlyError(reason, "Randevu serisi açılamadı."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" disabled={busy} onClick={() => void load()}>
        <Repeat2 />
        Randevu serisini görüntüle
        <ChevronRight />
      </button>
      {error && (
        <small className="customer-inline-error" role="alert">
          {error}
        </small>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="customer-action-dialog customer-series-dialog">
          <DialogHeader>
            <DialogTitle>Randevu serisi</DialogTitle>
            <DialogDescription>
              {series
                ? `${frequencyLabel(series.frequency)} · ${series.occurrenceCount} randevu`
                : "Seri hazırlanıyor."}
            </DialogDescription>
          </DialogHeader>
          <div className="customer-series-preview">
            {series?.bookings.map((item) => (
              <Link
                key={item.id}
                to={`/hesabim/randevular/${item.publicCode}`}
                onClick={() => setOpen(false)}
              >
                <b>{item.occurrenceIndex}</b>
                <span>
                  <strong>{formatLongDate(item.startAt)}</strong>
                  <small>
                    {formatTime(item.startAt)} ·{" "}
                    {STATUS_COPY[item.status as CustomerBookingStatus]?.label ??
                      item.status}
                  </small>
                </span>
                <ChevronRight />
              </Link>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Kapat
            </Button>
            {occurrenceIndex != null && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    !series ||
                    !window.confirm(
                      "Bu randevu ve serideki sonraki aktif randevular iptal edilsin mi?",
                    )
                  )
                    return;
                  setBusy(true);
                  void cancelCustomerBookingSeries(series.id, occurrenceIndex)
                    .then(() => {
                      setOpen(false);
                      onUpdated();
                    })
                    .catch((reason: unknown) =>
                      setError(friendlyError(reason, "Seri iptal edilemedi.")),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                Bu ve sonrakileri iptal et
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function nextDate(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatSeriesDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function frequencyLabel(value: BookingSeriesFrequency) {
  if (value === "WEEKLY") return "Her hafta";
  if (value === "BIWEEKLY") return "İki haftada bir";
  if (value === "FOUR_WEEKLY") return "Dört haftada bir";
  return "Her ay";
}

function CancelBookingDialog({
  booking,
  open,
  onOpenChange,
  onCompleted,
}: {
  booking: CustomerBookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="customer-action-dialog">
        <DialogHeader>
          <DialogTitle>Randevuyu iptal et</DialogTitle>
          <DialogDescription>
            {formatLongDate(booking.startAt)} {formatTime(booking.startAt)}{" "}
            randevun iptal edilecek.
          </DialogDescription>
        </DialogHeader>
        <label>
          <span>İptal nedeni</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Kısaca nedenini yazabilirsin"
            maxLength={300}
          />
        </label>
        {error && <AccountError message={error} />}
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            disabled={busy || reason.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await cancelCustomerBooking(booking.publicCode, reason.trim());
                onCompleted();
              } catch (caught) {
                setError(friendlyError(caught, "Randevu iptal edilemedi."));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "İptal ediliyor…" : "İptali onayla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeBookingDialog({
  booking,
  open,
  onOpenChange,
  onCompleted,
}: {
  booking: CustomerBookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const [date, setDate] = useState(
    new Date(booking.startAt).toISOString().slice(0, 10),
  );
  const [availability, setAvailability] =
    useState<BookingChangeAvailability | null>(null);
  const [professionalId, setProfessionalId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadAvailability = useCallback(async () => {
    if (!open || !date) return;
    setBusy(true);
    setError("");
    setStartTime("");
    try {
      const result = await getCustomerBookingAvailability(
        booking.publicCode,
        date,
      );
      const professionals = Array.isArray(result.professionals)
        ? result.professionals
        : [];
      const normalizedResult = {
        ...result,
        professionals,
        slots: Array.isArray(result.slots) ? result.slots : [],
      };
      setAvailability(normalizedResult);
      setProfessionalId(
        professionals.some(
          (professional) => professional.id === booking.professional.id,
        )
          ? booking.professional.id
          : (professionals[0]?.id ?? ""),
      );
    } catch (caught) {
      setAvailability(null);
      setError(friendlyError(caught, "Müsait saatler yüklenemedi."));
    } finally {
      setBusy(false);
    }
  }, [booking.professional.id, booking.publicCode, date, open]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const slots = useMemo(
    () =>
      availability?.slots.filter((slot) =>
        slot.availableProfessionalIds.includes(professionalId),
      ) ?? [],
    [availability, professionalId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="customer-action-dialog customer-change-dialog">
        <DialogHeader>
          <DialogTitle>Yeni zamanı seç</DialogTitle>
          <DialogDescription>
            Mevcut randevun yönetici kararına kadar korunur.
          </DialogDescription>
        </DialogHeader>
        <div className="customer-change-grid">
          <label>
            <span>Tarih</span>
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            <span>Uzman</span>
            <select
              value={professionalId}
              onChange={(event) => {
                setProfessionalId(event.target.value);
                setStartTime("");
              }}
            >
              {availability?.professionals.map((professional) => (
                <option value={professional.id} key={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="customer-change-slots">
          {busy ? (
            <p>
              <LoaderCircle className="is-spinning" /> Saatler yükleniyor
            </p>
          ) : slots.length ? (
            slots.map((slot) => (
              <button
                type="button"
                aria-pressed={startTime === slot.startTime}
                onClick={() => setStartTime(slot.startTime)}
                key={`${slot.startTime}-${slot.endTime}`}
              >
                <strong>{slot.startTime}</strong>
                <small>{slot.endTime} bitiş</small>
              </button>
            ))
          ) : (
            <p>Bu uzman için uygun saat bulunmuyor.</p>
          )}
        </div>
        <label>
          <span>
            Not <small>isteğe bağlı</small>
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Değişiklik nedenini ekleyebilirsin"
            maxLength={300}
          />
        </label>
        {error && <AccountError message={error} />}
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            disabled={busy || !professionalId || !startTime}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await createCustomerChangeRequest(booking.publicCode, {
                  date,
                  startTime,
                  professionalId,
                  expectedRevision: booking.revision,
                  reason: reason.trim() || undefined,
                });
                onCompleted();
              } catch (caught) {
                setError(
                  friendlyError(caught, "Değişiklik talebi gönderilemedi."),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Gönderiliyor…" : "Talebi gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountError({ message }: { message: string }) {
  return (
    <p className="customer-inline-error" role="alert">
      <XCircle />
      {message}
    </p>
  );
}

function AccountRouteLoader() {
  return (
    <main className="customer-route-loader">
      <LoaderCircle className="is-spinning" />
      <strong>Hesabın hazırlanıyor</strong>
    </main>
  );
}

function CustomerDashboardSkeleton() {
  return (
    <div
      className="customer-dashboard-skeleton"
      aria-label="Randevular yükleniyor"
    >
      <i />
      <i />
      <i />
    </div>
  );
}

function deduplicateBookings(bookings: CustomerBookingSummary[]) {
  return [...new Map(bookings.map((booking) => [booking.id, booking])).values()];
}

function isAbortError(reason: unknown) {
  return (
    reason instanceof DOMException
      ? reason.name === "AbortError"
      : reason instanceof Error && reason.name === "AbortError"
  );
}

function friendlyError(reason: unknown, fallback: string) {
  if (reason instanceof CustomerAccountApiError) {
    if (reason.status === 401) return "Oturumun sona erdi. Yeniden giriş yap.";
    if (reason.status >= 500)
      return "Sunucuya şu an ulaşamıyoruz. Biraz sonra tekrar dene.";
    return reason.message;
  }
  return reason instanceof Error ? reason.message : fallback;
}

function formatMoney(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(kurus / 100);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function day(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function month(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    timeZone: "Europe/Istanbul",
  })
    .format(new Date(value))
    .replace(".", "");
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10
    ? `05${digits.slice(-9, -7)} *** ** ${digits.slice(-2)}`
    : value;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(-10);
  return digits.length === 10
    ? `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
    : value;
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Misafir";
}

function changeStatusLabel(status: string) {
  return (
    {
      PENDING: "Değerlendiriliyor",
      APPROVED: "Değişiklik onaylandı",
      REJECTED: "Talep onaylanmadı",
      EXPIRED: "Talebin süresi doldu",
      CANCELLED: "Talep iptal edildi",
    }[status] ?? "Değişiklik talebi"
  );
}

function notificationLabel(eventType: string) {
  return (
    {
      BOOKING_RECEIVED: "Randevu talebi alındı",
      BOOKING_APPROVED: "Randevu onaylandı",
      BOOKING_REJECTED: "Randevu sonucu",
      BOOKING_CANCELLED: "Randevu iptal edildi",
      BOOKING_CREATED_BY_ADMIN: "Randevu oluşturuldu",
      BOOKING_RESCHEDULED: "Randevu güncellendi",
      BOOKING_REMINDER: "Randevu hatırlatması",
      CHANGE_REQUEST_RECEIVED: "Değişiklik talebi alındı",
      CHANGE_REQUEST_APPROVED: "Değişiklik onaylandı",
      CHANGE_REQUEST_REJECTED: "Değişiklik sonucu",
      REVIEW_REQUESTED: "Değerlendirme daveti",
      REVIEW_SUBMITTED: "Değerlendirmeniz alındı",
    }[eventType] ?? "Randevu bilgilendirmesi"
  );
}
