import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { LockKeyIcon } from "@phosphor-icons/react/dist/csr/LockKey";
import { MapPinIcon } from "@phosphor-icons/react/dist/csr/MapPin";
import { PhoneIcon } from "@phosphor-icons/react/dist/csr/Phone";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { ProhibitIcon as Ban } from "@phosphor-icons/react/dist/csr/Prohibit";
import { CalendarDotsIcon as CalendarClock } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { MapPinAreaIcon as MapPinned } from "@phosphor-icons/react/dist/csr/MapPinArea";
import { ChatCircleIcon as MessageCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { PhoneCallIcon as PhoneCall } from "@phosphor-icons/react/dist/csr/PhoneCall";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "../components/booking/BrandHeader";
import { StudioDock } from "../components/navigation/StudioDock";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { motionDurations, motionEase } from "../design-system/motion";
import {
  BookingAccessApiError,
  closeBookingAccessSession,
  cancelCurrentBooking,
  createBookingChangeRequest,
  downloadBookingCalendar,
  getBookingChangeAvailability,
  getCurrentBooking,
  getPublicBookingPolicy,
  requestBookingAccessCode,
  verifyBookingAccessCode,
} from "./bookingAccessApi";
import type {
  BookingAccessData,
  BookingAccessStatus,
  BookingChangeAvailability,
  PublicBookingPolicy,
} from "./bookingAccessTypes";
import "./bookingAccess.css";

type Stage = "checking" | "lookup" | "otp" | "booking";

const STATUS_COPY: Record<
  BookingAccessStatus,
  { tone: string; eyebrow: string; title: string; message: string }
> = {
  HOLD: {
    tone: "pending",
    eyebrow: "Saat geçici olarak ayrıldı",
    title: "Talebin henüz tamamlanmadı.",
    message: "Rezervasyon formuna dönerek işlemi tamamlayabilirsin.",
  },
  PENDING_APPROVAL: {
    tone: "pending",
    eyebrow: "Talebin stüdyoda",
    title: "Yönetici onayı bekleniyor.",
    message:
      "Salon ekibi talebini inceliyor. Karar verildiğinde bildirim planlanacak.",
  },
  CONFIRMED: {
    tone: "confirmed",
    eyebrow: "Randevun hazır",
    title: "Randevun onaylandı.",
    message:
      "En iyi deneyim için randevu saatinden 15 dakika önce salonda olmanı rica ediyoruz.",
  },
  REJECTED: {
    tone: "danger",
    eyebrow: "Talep sonucu",
    title: "Bu saat onaylanamadı.",
    message: "Sana uygun başka bir saat için yeni randevu oluşturabilirsin.",
  },
  CANCELLED: {
    tone: "danger",
    eyebrow: "Randevu durumu",
    title: "Randevu iptal edildi.",
    message: "Yeni bir tarih ve saat seçerek tekrar talep oluşturabilirsin.",
  },
  EXPIRED: {
    tone: "danger",
    eyebrow: "Süre doldu",
    title: "Geçici saat ayrımı sona erdi.",
    message: "Yeni bir saat seçerek randevu işlemini yeniden başlatabilirsin.",
  },
};

export function BookingLookupPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [referenceCode, setReferenceCode] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [booking, setBooking] = useState<BookingAccessData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    getCurrentBooking()
      .then((data) => {
        setBooking(data);
        setStage("booking");
      })
      .catch((requestError) => {
        if (
          requestError instanceof BookingAccessApiError &&
          requestError.status === 401
        )
          setStage("lookup");
        else {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Randevu bilgisi yüklenemedi.",
          );
          setStage("lookup");
        }
      });
  }, []);

  useEffect(() => {
    if (!resendAt) return;
    const update = () =>
      setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const requestCode = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await requestBookingAccessCode(referenceCode, phone);
      setDevelopmentCode(response.developmentCode ?? null);
      setResendAt(Date.now() + response.resendAfterSeconds * 1000);
      setStage("otp");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Doğrulama kodu istenemedi.",
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
      await verifyBookingAccessCode(referenceCode, phone, code);
      setBooking(await getCurrentBooking());
      setStage("booking");
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

  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      setBooking(await getCurrentBooking());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Randevu güncellenemedi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    try {
      await closeBookingAccessSession();
    } catch {
      /* Cookie yine de süresi dolunca kapanır. */
    }
    setBooking(null);
    setCode("");
    setStage("lookup");
    setError("");
  };

  return (
    <div className="app-shell booking-access-shell">
      {/* aria-label bilinçli olarak yok: BrandHeader kendi erişilebilir adını
          görünen metinden zaten üretiyor (bkz. BrandHeader.tsx). Bu sarmalayıcıya
          ayrı bir aria-label eklemek aynı Türkçe nokta'lı İ uyuşmazlığını bir
          seviye yukarı taşırdı. */}
      <section className="compact-brand-stage">
        <BrandHeader dataMode="live" href="/" />
      </section>
      <main className="booking-access-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: motionDurations.page, ease: motionEase }}
          >
            {stage === "checking" && <AccessSkeleton />}
            {stage === "lookup" && (
              <AccessFormShell
                icon={<LockKeyIcon size={28} weight="duotone" />}
                eyebrow="Güvenli randevu takibi"
                title="Randevunu bul."
                lead="Referans kodun ve telefonunla güncel durumu gör."
              >
                <form className="access-form" onSubmit={requestCode}>
                  <label>
                    <span>Randevu referansı</span>
                    <input
                      autoFocus
                      value={referenceCode}
                      onChange={(event) =>
                        setReferenceCode(event.target.value.toUpperCase())
                      }
                      placeholder="RI-12AB34CD"
                      minLength={4}
                      maxLength={32}
                      required
                    />
                  </label>
                  <label>
                    <span>Cep telefonu</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="05xx xxx xx xx"
                      inputMode="tel"
                      autoComplete="tel"
                      minLength={10}
                      maxLength={24}
                      required
                    />
                  </label>
                  {error && (
                    <p className="access-error" role="alert">
                      <WarningCircleIcon size={19} weight="duotone" />
                      {error}
                    </p>
                  )}
                  <button
                    className="ri-button ri-button--primary"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Kontrol ediliyor…" : "Doğrulama kodu gönder"}
                  </button>
                </form>
                <p className="access-privacy">
                  <InfoIcon size={18} weight="duotone" /> Bilgilerin eşleşirse
                  telefonuna tek kullanımlık kod gönderilir.
                </p>
              </AccessFormShell>
            )}
            {stage === "otp" && (
              <AccessFormShell
                icon={<PhoneIcon size={28} weight="duotone" />}
                eyebrow="Son güvenlik adımı"
                title="Kodunu gir."
                lead={`${maskForDisplay(phone)} numarasına gönderilen 6 haneli kodu kullan.`}
              >
                <form className="access-form" onSubmit={verify}>
                  <label>
                    <span>Doğrulama kodu</span>
                    <input
                      className="access-code-input"
                      autoFocus
                      value={code}
                      onChange={(event) =>
                        setCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="• • • • • •"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      required
                    />
                  </label>
                  {developmentCode && (
                    <div className="access-dev-code">
                      <span>Geliştirme kodu</span>
                      <strong>{developmentCode}</strong>
                      <small>Production'da gösterilmez.</small>
                    </div>
                  )}
                  {error && (
                    <p className="access-error" role="alert">
                      <WarningCircleIcon size={19} weight="duotone" />
                      {error}
                    </p>
                  )}
                  <button
                    className="ri-button ri-button--primary"
                    disabled={busy || code.length !== 6}
                    type="submit"
                  >
                    {busy ? "Doğrulanıyor…" : "Randevumu göster"}
                  </button>
                  <div className="access-form__secondary">
                    <button
                      type="button"
                      onClick={() => {
                        setStage("lookup");
                        setError("");
                      }}
                    >
                      <ArrowLeftIcon size={17} weight="bold" /> Bilgileri
                      değiştir
                    </button>
                    <button
                      type="button"
                      disabled={seconds > 0 || busy}
                      onClick={() => void requestCode()}
                    >
                      {seconds > 0
                        ? `${seconds} sn sonra tekrar gönder`
                        : "Kodu tekrar gönder"}
                    </button>
                  </div>
                </form>
              </AccessFormShell>
            )}
            {stage === "booking" && booking && (
              <BookingStatus
                booking={booking}
                busy={busy}
                error={error}
                onRefresh={refresh}
                onClose={close}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <StudioDock />
    </div>
  );
}

function AccessFormShell({
  icon,
  eyebrow,
  title,
  lead,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="access-card">
      <div className="access-card__intro">
        <span className="access-card__icon">{icon}</span>
        <div>
          <small>{eyebrow}</small>
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
      </div>
      {children}
      <a className="access-back-link" href="/">
        <ArrowLeftIcon size={17} weight="bold" /> Randevu oluşturmaya dön
      </a>
    </section>
  );
}

function BookingStatus({
  booking,
  busy,
  error,
  onRefresh,
  onClose,
}: {
  booking: BookingAccessData;
  busy: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  onClose: () => Promise<void>;
}) {
  const meta = STATUS_COPY[booking.status];
  const isConfirmed = booking.status === "CONFIRMED";
  const date = formatDate(booking.startAt);
  const time = `${formatTime(booking.startAt)}–${formatTime(booking.endAt)}`;
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [policy, setPolicy] = useState<PublicBookingPolicy | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [changeDate, setChangeDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [availability, setAvailability] =
    useState<BookingChangeAvailability | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const notifications = useMemo(
    () => booking.notifications.filter((item) => item.status !== "SKIPPED"),
    [booking.notifications],
  );
  const pendingChange = booking.changeRequests.find(
    (request) => request.status === "PENDING",
  );

  useEffect(() => {
    void getPublicBookingPolicy(booking.branch.slug)
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, [booking.branch.slug]);

  useEffect(() => {
    if (!changeOpen || !changeDate) {
      setAvailability(null);
      return;
    }
    let active = true;
    setActionBusy(true);
    setActionError("");
    void getBookingChangeAvailability(changeDate, booking.professional.id)
      .then((data) => {
        if (active) setAvailability(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setActionError(
            requestError instanceof Error
              ? requestError.message
              : "Müsait saatler yüklenemedi.",
          );
        }
      })
      .finally(() => {
        if (active) setActionBusy(false);
      });
    return () => {
      active = false;
    };
  }, [booking.professional.id, changeDate, changeOpen]);

  const addCalendar = async () => {
    setCalendarBusy(true);
    setCalendarError("");
    try {
      await downloadBookingCalendar(
        `ramazan-inanc-${booking.publicCode.toLowerCase()}.ics`,
      );
    } catch (requestError) {
      setCalendarError(
        requestError instanceof Error
          ? requestError.message
          : "Takvim kaydı indirilemedi.",
      );
    } finally {
      setCalendarBusy(false);
    }
  };

  const submitChange = async () => {
    if (!changeDate || !selectedTime) return;
    setActionBusy(true);
    setActionError("");
    try {
      await createBookingChangeRequest({
        date: changeDate,
        startTime: selectedTime,
        professionalId: booking.professional.id,
        expectedRevision: booking.revision,
        reason: changeReason.trim() || undefined,
      });
      setChangeOpen(false);
      await onRefresh();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Değişiklik talebi gönderilemedi.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  const submitCancellation = async () => {
    if (cancelReason.trim().length < 3) return;
    setActionBusy(true);
    setActionError("");
    try {
      await cancelCurrentBooking(cancelReason.trim());
      setCancelOpen(false);
      await onRefresh();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Randevu iptal edilemedi.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section className={`booking-status booking-status--${meta.tone}`}>
      <header className="booking-status__hero">
        <span className="booking-status__mark">
          {isConfirmed ? (
            <CheckCircleIcon size={32} weight="duotone" />
          ) : booking.status === "PENDING_APPROVAL" ? (
            <ClockIcon size={32} weight="duotone" />
          ) : (
            <WarningCircleIcon size={32} weight="duotone" />
          )}
        </span>
        <div>
          <small>{meta.eyebrow}</small>
          <h1>{meta.title}</h1>
          <p>{meta.message}</p>
        </div>
        <span className="booking-status__reference">
          <small>Referans</small>
          <strong>{booking.publicCode}</strong>
        </span>
      </header>
      {(error || actionError) && (
        <p className="access-error" role="alert">
          <WarningCircleIcon size={19} />
          {error || actionError}
        </p>
      )}
      {pendingChange && (
        <article className="booking-change-pending" aria-live="polite">
          <CalendarClock size={21} />
          <span>
            <strong>Yeni saat talebin inceleniyor</strong>
            <small>
              {formatDate(pendingChange.requestedStartAt)} ·{" "}
              {formatTime(pendingChange.requestedStartAt)}
              {" · "}
              {pendingChange.requestedProfessional.name}
            </small>
          </span>
          <b>Bekliyor</b>
        </article>
      )}
      <div className="booking-status__grid">
        <div className="booking-status__primary">
          <article className="booking-time-card">
            <span>
              <CalendarCheckIcon size={22} weight="duotone" />
              <small>Tarih</small>
              <strong>{date}</strong>
            </span>
            <span>
              <ClockIcon size={22} weight="duotone" />
              <small>Saat</small>
              <strong>{time}</strong>
            </span>
            <span>
              <UserCircleIcon size={22} weight="duotone" />
              <small>Uzman</small>
              <strong>{booking.professional.name}</strong>
            </span>
          </article>
          <article className="booking-services">
            <div className="section-heading">
              <span>Hizmetler</span>
              <strong>{formatMoney(booking.totalPriceKurus)}</strong>
            </div>
            {booking.items.map((item) => (
              <div key={item.id}>
                <span>
                  <strong>{item.serviceName}</strong>
                  <small>{item.durationMinutes} dk</small>
                </span>
                <b>{formatMoney(item.priceKurus)}</b>
              </div>
            ))}
          </article>
          <article className="arrival-note">
            <ClockIcon size={22} weight="duotone" />
            <span>
              <strong>
                {booking.branch.arrivalLeadMinutes} dakika önce salonda ol.
              </strong>
              <small>Randevu akışını sakin başlatabilmemiz için.</small>
            </span>
          </article>
          {(booking.canRequestChange || booking.canCancel || isConfirmed) && (
            <div className="booking-status__actions booking-status__actions--manage">
              {isConfirmed && (
                <Button
                  type="button"
                  disabled={calendarBusy}
                  onClick={() => void addCalendar()}
                >
                  <CalendarCheckIcon size={19} weight="bold" />{" "}
                  {calendarBusy ? "Hazırlanıyor…" : "Takvime ekle"}
                </Button>
              )}
              {booking.canRequestChange && !pendingChange && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActionError("");
                    setChangeOpen(true);
                  }}
                >
                  <CalendarClock /> Saat değişikliği iste
                </Button>
              )}
              {booking.canCancel && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setActionError("");
                    setCancelOpen(true);
                  }}
                >
                  <Ban /> Randevuyu iptal et
                </Button>
              )}
              {calendarError && (
                <p className="access-error" role="alert">
                  {calendarError}
                </p>
              )}
            </div>
          )}
          {policy?.customerPolicyText && (
            <p className="booking-policy-copy">{policy.customerPolicyText}</p>
          )}
          {!["PENDING_APPROVAL", "CONFIRMED"].includes(booking.status) && (
            <a className="ri-button ri-button--primary" href="/">
              Yeni randevu oluştur
            </a>
          )}
        </div>
        <aside className="booking-status__side">
          <article className="booking-location">
            <MapPinIcon size={21} weight="duotone" />
            <span>
              <small>Salon</small>
              <strong>{booking.branch.name}</strong>
              <p>
                {[
                  booking.branch.address,
                  booking.branch.district,
                  booking.branch.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </span>
          </article>
          {policy && (
            <div className="booking-contact-actions">
              {policy.salonPhone && (
                <a href={`tel:${policy.salonPhone}`}>
                  <PhoneCall /> Salonu ara
                </a>
              )}
              {policy.whatsappPhone && (
                <a
                  href={`https://wa.me/${policy.whatsappPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> WhatsApp
                </a>
              )}
              {policy.mapsUrl && (
                <a href={policy.mapsUrl} target="_blank" rel="noreferrer">
                  <MapPinned /> Yol tarifi
                </a>
              )}
            </div>
          )}
          <NotificationHistory notifications={notifications} />
        </aside>
      </div>
      <footer className="booking-status__footer">
        <button type="button" disabled={busy} onClick={() => void onRefresh()}>
          <ArrowClockwiseIcon
            className={busy ? "is-spinning" : ""}
            size={18}
            weight="bold"
          />{" "}
          Durumu yenile
        </button>
        <button type="button" onClick={() => void onClose()}>
          <SignOutIcon size={18} weight="bold" /> Güvenli çıkış
        </button>
      </footer>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="booking-action-dialog">
          <DialogHeader>
            <DialogTitle>Yeni bir saat iste</DialogTitle>
            <DialogDescription>
              Mevcut randevun, yönetici yeni saati onaylayana kadar korunur.
            </DialogDescription>
          </DialogHeader>
          <div className="booking-change-form">
            <Label htmlFor="change-date">Yeni tarih</Label>
            <input
              id="change-date"
              type="date"
              min={todayDateKey()}
              value={changeDate}
              onChange={(event) => {
                setChangeDate(event.target.value);
                setSelectedTime("");
              }}
            />
            {actionBusy && (
              <p className="admin-inline-loading">
                <i /> Müsait saatler yükleniyor
              </p>
            )}
            {!actionBusy && availability && (
              <div
                className="booking-change-slots"
                role="group"
                aria-label="Müsait saatler"
              >
                {availability.slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.startTime}
                    aria-pressed={selectedTime === slot.startTime}
                    onClick={() => setSelectedTime(slot.startTime)}
                  >
                    <strong>{slot.startTime}</strong>
                    <small>{slot.endTime}</small>
                  </button>
                ))}
                {!availability.slots.length && (
                  <p>Bu tarihte uygun saat bulunmuyor.</p>
                )}
              </div>
            )}
            <Label htmlFor="change-reason">
              Kısa not <small>isteğe bağlı</small>
            </Label>
            <Textarea
              id="change-reason"
              value={changeReason}
              onChange={(event) => setChangeReason(event.target.value)}
              maxLength={300}
              placeholder="Saat değişikliği nedenini kısaca yazabilirsin."
            />
            {actionError && (
              <p className="access-error" role="alert">
                {actionError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setChangeOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              disabled={!selectedTime || actionBusy}
              onClick={() => void submitChange()}
            >
              {actionBusy ? "Gönderiliyor…" : "Talebi gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Randevu iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              İptal edildiğinde saat tekrar müsait olur. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="booking-change-form">
            <Label htmlFor="cancel-reason">İptal nedeni</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              maxLength={300}
              placeholder="Kısaca iptal nedenini yaz."
            />
            {actionError && (
              <p className="access-error" role="alert">
                {actionError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Randevuyu koru</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelReason.trim().length < 3 || actionBusy}
              onClick={(event) => {
                event.preventDefault();
                void submitCancellation();
              }}
            >
              {actionBusy ? "İptal ediliyor…" : "Randevuyu iptal et"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function NotificationHistory({
  notifications,
}: {
  notifications: BookingAccessData["notifications"];
}) {
  const eventLabels: Record<string, string> = {
    BOOKING_RECEIVED: "Talep alındı",
    BOOKING_APPROVED: "Onay bildirimi",
    BOOKING_REJECTED: "Talep sonucu",
    BOOKING_CANCELLED: "İptal bildirimi",
    BOOKING_REMINDER: "Randevu hatırlatması",
    CHANGE_REQUEST_RECEIVED: "Değişiklik talebi alındı",
    CHANGE_REQUEST_APPROVED: "Yeni saat onaylandı",
    CHANGE_REQUEST_REJECTED: "Değişiklik sonucu",
  };
  const statusLabels: Record<string, string> = {
    PENDING: "Gönderim bekliyor",
    PROCESSING: "İşleniyor",
    SENT: "Gönderildi",
    DELIVERED: "Teslim edildi",
    RETRY_SCHEDULED: "Yeniden denenecek",
    FAILED: "Gönderilemedi",
    SKIPPED: "Gönderilmedi",
  };
  return (
    <article className="notification-history">
      <div className="section-heading">
        <span>Bildirim geçmişi</span>
        <small>SMS</small>
      </div>
      {notifications.length ? (
        <ol>
          {notifications.map((item) => (
            <li
              key={item.id}
              className={`notification-history__${item.status.toLowerCase()}`}
            >
              <i />
              <span>
                <strong>{eventLabels[item.eventType]}</strong>
                <small>
                  {statusLabels[item.status]} ·{" "}
                  {formatShortTimestamp(item.sentAt ?? item.createdAt)}
                </small>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p>Henüz bir bildirim kaydı yok.</p>
      )}
      <small className="notification-history__note">
        Gönderildi, operatörün mesajı kabul ettiğini belirtir; teslim raporu
        değildir.
      </small>
    </article>
  );
}

function AccessSkeleton() {
  return (
    <section
      className="access-card access-skeleton"
      aria-label="Randevu oturumu kontrol ediliyor"
    >
      <i />
      <i />
      <i />
      <i />
    </section>
  );
}
function maskForDisplay(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `*** *** ${digits.slice(-4)}` : "telefonuna";
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value / 100);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
function formatShortTimestamp(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
function todayDateKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}
