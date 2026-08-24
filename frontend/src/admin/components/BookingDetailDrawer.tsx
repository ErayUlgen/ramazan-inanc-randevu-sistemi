import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { NoteIcon } from "@phosphor-icons/react/dist/csr/Note";
import { PhoneIcon } from "@phosphor-icons/react/dist/csr/Phone";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProfessionalAvatar } from "../../components/ui/ProfessionalAvatar";
import { motionDurations, motionEase } from "../../design-system/motion";
import type {
  AdminBooking,
  AdminBookingBoard,
  AdminBookingSeries,
  AdminRole,
} from "../admin.types";
import {
  cancelAdminBookingSeries,
  getAdminBookingSeries,
  markAdminBookingNoShow,
  revertAdminBookingNoShow,
} from "../api/adminApi";
import {
  formatMoney,
  formatTime,
  isFutureBooking,
  SOURCE_LABELS,
  STATUS_META,
  VISIT_META,
} from "../lib/adminFormat";
import { BookingAuditHistory } from "./BookingAuditHistory";
import { BookingEditDialog } from "./BookingEditDialog";
import { BookingNotificationHistory } from "./BookingNotificationHistory";
import { BookingFormsPanel } from "./BookingFormsPanel";

type ActionKind = "approve" | "reject" | "cancel";

type Props = {
  booking: AdminBooking | null;
  board: AdminBookingBoard;
  onClose: () => void;
  onAction: (
    kind: ActionKind,
    booking: AdminBooking,
    reason?: string,
  ) => Promise<void>;
  onOpenCustomer: () => void;
  onUpdated: (booking: AdminBooking, message: string) => void;
  onSeriesChanged: (message: string) => void;
  role: AdminRole;
};

export function BookingDetailDrawer({
  booking,
  board,
  onClose,
  onAction,
  onOpenCustomer,
  onUpdated,
  onSeriesChanged,
  role,
}: Props) {
  const reduceMotion = useReducedMotion();
  const closeButton = useRef<HTMLButtonElement>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [editor, setEditor] = useState<"details" | "reschedule" | null>(null);
  const [noShowAction, setNoShowAction] = useState<
    "mark" | "revert" | null
  >(null);
  const isOpen = Boolean(booking);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !action) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [action, isOpen, onClose]);

  useEffect(() => {
    if (!booking?.id) return;
    window.setTimeout(() => closeButton.current?.focus(), 0);
  }, [booking?.id]);

  return createPortal(
    <AnimatePresence>
      {booking && (
        <div className="admin-drawer-layer">
          <motion.button
            type="button"
            className="admin-drawer-backdrop"
            aria-label="Randevu detayını kapat"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="booking-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-drawer-title"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: motionDurations.page, ease: motionEase }}
          >
            <header className="booking-drawer__header">
              <span>
                <small>Randevu detayı</small>
                <strong id="booking-drawer-title">{booking.publicCode}</strong>
              </span>
              <div className="booking-drawer__header-actions">
                <button
                  type="button"
                  onClick={onOpenCustomer}
                  aria-label="Müşteri görünümüne geç"
                  title="Müşteri görünümü"
                >
                  <ArrowSquareOutIcon size={20} weight="bold" />
                </button>
                <button
                  ref={closeButton}
                  type="button"
                  onClick={onClose}
                  aria-label="Detayı kapat"
                >
                  <XIcon size={22} weight="bold" />
                </button>
              </div>
            </header>

            <div className="booking-drawer__body">
              <section className="drawer-hero">
                <div className="drawer-status-row">
                  <span
                    className={`admin-status-chip admin-status-chip--${STATUS_META[booking.status].tone}`}
                  >
                    {STATUS_META[booking.status].label}
                  </span>
                  {booking.visitStatus === "NO_SHOW" && (
                    <span
                      className={`admin-visit-chip admin-visit-chip--${VISIT_META[booking.visitStatus].tone}`}
                    >
                      {VISIT_META[booking.visitStatus].label}
                    </span>
                  )}
                  {booking.seriesId && (
                    <span className="admin-series-chip">
                      Seri {booking.occurrenceIndex ?? ""}
                      {booking.isSeriesException ? " · değiştirilmiş" : ""}
                    </span>
                  )}
                </div>
                <strong>
                  {formatTime(booking.startAt, board.branch.timezone)}–
                  {formatTime(booking.endAt, board.branch.timezone)}
                </strong>
                <p>
                  {formatFullDate(booking.startAt)} ·{" "}
                  {booking.totalDurationMinutes} dakika
                </p>
              </section>

              <section className="drawer-section">
                <h3>Müşteri</h3>
                <dl className="drawer-facts">
                  <div>
                    <dt>
                      <UserIcon size={19} weight="duotone" /> Ad soyad
                    </dt>
                    <dd>
                      {booking.customerNameSnapshot ??
                        booking.customer?.fullName ??
                        "Henüz girilmedi"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <PhoneIcon size={19} weight="duotone" /> Telefon
                    </dt>
                    <dd>
                      {(booking.customerPhoneSnapshot ??
                      booking.customer?.phone) ? (
                        <a
                          href={`tel:${booking.customerPhoneSnapshot ?? booking.customer?.phone}`}
                        >
                          {booking.customerPhoneSnapshot ??
                            booking.customer?.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="drawer-section">
                <h3>Randevu</h3>
                <dl className="drawer-facts">
                  <div>
                    <dt>
                      <UserIcon size={19} weight="duotone" /> Uzman
                    </dt>
                    <dd className="drawer-professional-identity">
                      <ProfessionalAvatar
                        name={booking.professional.name}
                        src={booking.professional.photoUrl ?? undefined}
                        size="sm"
                      />
                      <span>{booking.professional.name}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <CalendarBlankIcon size={19} weight="duotone" /> Kaynak
                    </dt>
                    <dd>{SOURCE_LABELS[booking.source]}</dd>
                  </div>
                  <div>
                    <dt>
                      <ClockIcon size={19} weight="duotone" /> Oluşturuldu
                    </dt>
                    <dd>{formatTimestamp(booking.createdAt)}</dd>
                  </div>
                </dl>
                <div className="drawer-services">
                  {booking.items.map((item) => (
                    <div key={item.id}>
                      <span>
                        <strong>{item.serviceName}</strong>
                        <small>{item.durationMinutes} dk</small>
                      </span>
                      <b>{formatMoney(item.priceKurus)}</b>
                    </div>
                  ))}
                  <div className="drawer-services__total">
                    <span>Toplam</span>
                    <strong>{formatMoney(booking.totalPriceKurus)}</strong>
                  </div>
                </div>
              </section>

              {booking.customerNote && (
                <section className="drawer-section drawer-note">
                  <h3>
                    <NoteIcon size={18} /> Müşteri notu
                  </h3>
                  <p>{booking.customerNote}</p>
                </section>
              )}
              {booking.adminNote && (
                <section className="drawer-section drawer-note drawer-note--internal">
                  <h3>
                    <NoteIcon size={18} /> Yönetici notu
                  </h3>
                  <p>{booking.adminNote}</p>
                </section>
              )}

              {(booking.rejectionReason || booking.cancellationReason) && (
                <section className="drawer-section drawer-note drawer-note--danger">
                  <h3>
                    <WarningCircleIcon size={18} /> İşlem nedeni
                  </h3>
                  <p>{booking.rejectionReason ?? booking.cancellationReason}</p>
                </section>
              )}

              <section
                className="drawer-assurances"
                aria-label="Randevu operasyon notları"
              >
                <p>
                  <CheckCircleIcon size={19} weight="duotone" />
                  <span>
                    <strong>
                      {board.branch.arrivalLeadMinutes} dakika erken geliş
                    </strong>
                    Müşteriden salona erken gelmesi istenir.
                  </span>
                </p>
                <p>
                  <ClockIcon size={19} weight="duotone" />
                  <span>
                    <strong>
                      {board.branch.reminderLeadMinutes} dakika önce hatırlatma
                      hedefi
                    </strong>
                    Bu bilgi planlama hedefidir; mesaj gönderildiğini göstermez.
                  </span>
                </p>
              </section>

              {booking.seriesId && (
                <AdminSeriesPanel
                  booking={booking}
                  canManage={role !== "PROFESSIONAL"}
                  onChanged={onSeriesChanged}
                />
              )}

              <BookingFormsPanel bookingId={booking.id} />

              {booking.status === "CONFIRMED" &&
                new Date(booking.startAt).getTime() <=
                  new Date(board.serverNow).getTime() && (
                <section className="drawer-section drawer-operation-actions">
                  <h3>İstisna işlemi</h3>
                  <div className="drawer-action-grid">
                    <button
                      type="button"
                      className={`drawer-action-button ${
                        booking.visitStatus === "NO_SHOW"
                          ? "drawer-action-button--neutral"
                          : "drawer-action-button--danger"
                      }`}
                      onClick={() =>
                        setNoShowAction(
                          booking.visitStatus === "NO_SHOW" ? "revert" : "mark",
                        )
                      }
                    >
                      {booking.visitStatus === "NO_SHOW" ? (
                        <CheckCircleIcon size={19} weight="bold" />
                      ) : (
                        <XCircleIcon size={19} weight="bold" />
                      )}
                      <span>
                        {booking.visitStatus === "NO_SHOW"
                          ? "Gelmedi işaretini geri al"
                          : "Gelmedi olarak işaretle"}
                      </span>
                    </button>
                  </div>
                  <p className="drawer-operation-hint">
                    Yalnız müşteri randevuya katılmadıysa kullanın.
                  </p>
                </section>
              )}

              {role !== "PROFESSIONAL" &&
                booking.status === "CONFIRMED" &&
                isFutureBooking(booking, board.serverNow) && (
                  <section className="drawer-section drawer-edit-actions">
                    <h3>Randevuyu yönet</h3>
                    <div className="drawer-action-grid">
                      <button
                        type="button"
                        className="drawer-action-button drawer-action-button--neutral"
                        onClick={() => setEditor("details")}
                      >
                        <NoteIcon size={19} weight="bold" />
                        <span>Bilgileri düzenle</span>
                      </button>
                      <button
                        type="button"
                        className="drawer-action-button drawer-action-button--neutral"
                        onClick={() => setEditor("reschedule")}
                      >
                        <CalendarBlankIcon size={19} weight="bold" />
                        <span>Tarih veya saati değiştir</span>
                      </button>
                    </div>
                  </section>
                )}

              {role !== "PROFESSIONAL" && (
                <>
                  <BookingNotificationHistory bookingId={booking.id} />
                  <BookingAuditHistory bookingId={booking.id} />
                </>
              )}
            </div>

            {role !== "PROFESSIONAL" &&
              (booking.status === "PENDING_APPROVAL" ||
                (booking.status === "CONFIRMED" &&
                  isFutureBooking(booking, board.serverNow))) && (
                <footer className="booking-drawer__actions">
                  {booking.status === "PENDING_APPROVAL" && (
                    <>
                      <button
                        className="admin-danger-button"
                        type="button"
                        onClick={() => setAction("reject")}
                      >
                        <XCircleIcon size={20} weight="bold" /> Reddet
                      </button>
                      <button
                        className="admin-primary-button"
                        type="button"
                        onClick={() => setAction("approve")}
                      >
                        <CheckCircleIcon size={20} weight="bold" /> Onayla
                      </button>
                    </>
                  )}
                  {booking.status === "CONFIRMED" && (
                    <button
                      className="admin-danger-button admin-danger-button--wide"
                      type="button"
                      onClick={() => setAction("cancel")}
                    >
                      <XCircleIcon size={20} weight="bold" /> Randevuyu iptal et
                    </button>
                  )}
                </footer>
              )}
          </motion.aside>

          <AnimatePresence>
            {action && (
              <ActionDialog
                kind={action}
                booking={booking}
                onClose={() => setAction(null)}
                onConfirm={async (reason) => {
                  await onAction(action, booking, reason);
                  setAction(null);
                }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {noShowAction && (
              <NoShowDialog
                kind={noShowAction}
                booking={booking}
                onClose={() => setNoShowAction(null)}
                onConfirm={async (reason) => {
                  const updated =
                    noShowAction === "mark"
                      ? await markAdminBookingNoShow(
                          booking.id,
                          booking.revision,
                          reason,
                        )
                      : await revertAdminBookingNoShow(
                          booking.id,
                          booking.revision,
                          reason,
                        );
                  setNoShowAction(null);
                  onUpdated(
                    updated,
                    noShowAction === "mark"
                      ? "Randevu gelmedi olarak işaretlendi."
                      : "Gelmedi işareti geri alındı.",
                  );
                }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {editor && (
              <BookingEditDialog
                mode={editor}
                booking={booking}
                board={board}
                onClose={() => setEditor(null)}
                onSaved={(updated, message) => {
                  setEditor(null);
                  onUpdated(updated, message);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function AdminSeriesPanel({
  booking,
  canManage,
  onChanged,
}: {
  booking: AdminBooking;
  canManage: boolean;
  onChanged: (message: string) => void;
}) {
  const [series, setSeries] = useState<AdminBookingSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSeries(null);
    setError("");
  }, [booking.seriesId]);

  const load = async () => {
    if (!booking.seriesId) return;
    setLoading(true);
    setError("");
    try {
      setSeries(await getAdminBookingSeries(booking.seriesId));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Randevu serisi yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="drawer-section admin-series-panel">
      <header>
        <span>
          <small>Düzenli randevu</small>
          <h3>Serinin kalanını yönet</h3>
        </span>
        {!series && (
          <button
            type="button"
            className="admin-quiet-button"
            disabled={loading}
            onClick={() => void load()}
          >
            <CalendarBlankIcon size={18} />
            {loading ? "Yükleniyor…" : "Tarihleri göster"}
          </button>
        )}
      </header>
      {series && (
        <>
          <div className="admin-series-occurrences">
            {series.bookings.map((item) => (
              <span
                key={item.id}
                className={
                  item.id === booking.id
                    ? "is-current"
                    : item.status === "CANCELLED"
                      ? "is-cancelled"
                      : ""
                }
              >
                <b>{item.occurrenceIndex ?? "—"}</b>
                <span>
                  <strong>{formatFullDate(item.startAt)}</strong>
                  <small>
                    {formatTimestamp(item.startAt)}
                    {item.isSeriesException ? " · Değiştirilmiş" : ""}
                  </small>
                </span>
                <em>{seriesStatusLabel(item.status)}</em>
              </span>
            ))}
          </div>
          {canManage &&
            booking.occurrenceIndex != null &&
            booking.startAt > new Date().toISOString() && (
              <button
                type="button"
                className="admin-danger-button admin-series-cancel"
                disabled={loading}
                onClick={() => {
                  if (
                    !booking.seriesId ||
                    !window.confirm(
                      "Bu randevu ve serideki sonraki aktif randevular iptal edilsin mi?",
                    )
                  ) {
                    return;
                  }
                  setLoading(true);
                  setError("");
                  void cancelAdminBookingSeries(
                    booking.seriesId,
                    booking.occurrenceIndex!,
                  )
                    .then((result) =>
                      onChanged(
                        `${result.count} gelecek randevu iptal edildi.`,
                      ),
                    )
                    .catch((reason: unknown) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Randevu serisi iptal edilemedi.",
                      ),
                    )
                    .finally(() => setLoading(false));
                }}
              >
                <XCircleIcon size={18} weight="bold" />
                Bu ve sonrakileri iptal et
              </button>
            )}
        </>
      )}
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function seriesStatusLabel(status: AdminBooking["status"]) {
  if (status === "PENDING_APPROVAL") return "Onay bekliyor";
  if (status === "CONFIRMED") return "Onaylı";
  if (status === "CANCELLED") return "İptal";
  if (status === "REJECTED") return "Reddedildi";
  if (status === "EXPIRED") return "Süresi doldu";
  return "Saat tutuluyor";
}

function NoShowDialog({
  kind,
  booking,
  onClose,
  onConfirm,
}: {
  kind: "mark" | "revert";
  booking: AdminBooking;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRevert = kind === "revert";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isRevert && reason.trim().length < 3) {
      setError("Geri alma gerekçesi en az 3 karakter olmalıdır.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "İşlem tamamlanamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="admin-action-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="admin-action-backdrop"
        type="button"
        onClick={onClose}
        aria-label="İşlemi kapat"
      />
      <motion.form
        className="admin-action-dialog"
        onSubmit={submit}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="no-show-dialog-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
      >
        <span className="admin-action-dialog__icon admin-action-dialog__icon--cancel">
          {isRevert ? (
            <CheckCircleIcon size={28} weight="duotone" />
          ) : (
            <WarningCircleIcon size={28} weight="duotone" />
          )}
        </span>
        <h2 id="no-show-dialog-title">
          {isRevert ? "Gelmedi işaretini geri al" : "Gelmedi olarak işaretle"}
        </h2>
        <p>
          {booking.customerNameSnapshot ?? booking.publicCode} ·{" "}
          {isRevert
            ? "Randevu normal geçmiş randevu görünümüne dönecek."
            : "Bu istisna, değerlendirme davetini geçersiz kılar."}
        </p>
        <label>
          <span>{isRevert ? "Geri alma gerekçesi" : "İç not (isteğe bağlı)"}</span>
          <textarea
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder={
              isRevert
                ? "Örn. Yanlışlıkla işaretlendi."
                : "Yalnız salon ekibinin göreceği kısa not."
            }
          />
          <small>{reason.length}/300</small>
        </label>
        {error && (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button
            className="admin-quiet-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Vazgeç
          </button>
          <button
            className={isRevert ? "admin-primary-button" : "admin-danger-button"}
            type="submit"
            disabled={submitting || (isRevert && reason.trim().length < 3)}
          >
            {submitting
              ? "İşleniyor…"
              : isRevert
                ? "Geri al"
                : "Gelmedi olarak işaretle"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function ActionDialog({
  kind,
  booking,
  onClose,
  onConfirm,
}: {
  kind: ActionKind;
  booking: AdminBooking;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReason = kind !== "approve";
  const copy = {
    approve: {
      title: "Talebi onayla",
      text: "Bu saat kesinleşecek ve müşterinin randevusu onaylanacak.",
      action: "Onayı kesinleştir",
    },
    reject: {
      title: "Talebi reddet",
      text: "Saat yeniden rezervasyona açılacak. Kısa bir neden yazın.",
      action: "Talebi reddet",
    },
    cancel: {
      title: "Randevuyu iptal et",
      text: "Onaylı randevu iptal edilecek ve saat yeniden açılacak.",
      action: "İptali kesinleştir",
    },
  }[kind];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (needsReason && reason.trim().length < 3) {
      setError("Neden en az 3 karakter olmalıdır.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(needsReason ? reason.trim() : undefined);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "İşlem tamamlanamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="admin-action-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="admin-action-backdrop"
        type="button"
        onClick={onClose}
        aria-label="İşlemi kapat"
      />
      <motion.form
        className="admin-action-dialog"
        onSubmit={submit}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-action-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
      >
        <span
          className={`admin-action-dialog__icon admin-action-dialog__icon--${kind}`}
        >
          {kind === "approve" ? (
            <CheckCircleIcon size={28} weight="duotone" />
          ) : (
            <WarningCircleIcon size={28} weight="duotone" />
          )}
        </span>
        <h2 id="admin-action-title">{copy.title}</h2>
        <p>
          {booking.customer?.fullName ?? booking.publicCode} · {copy.text}
        </p>
        {needsReason && (
          <label>
            <span>İşlem nedeni</span>
            <textarea
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
              placeholder={
                kind === "reject"
                  ? "Örn. Uzman bu saatte uygun değil."
                  : "Örn. Müşteri talebiyle iptal edildi."
              }
            />
            <small>{reason.length}/300</small>
          </label>
        )}
        {error && (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button
            className="admin-quiet-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Vazgeç
          </button>
          <button
            className={
              kind === "approve"
                ? "admin-primary-button"
                : "admin-danger-button"
            }
            type="submit"
            disabled={submitting || (needsReason && reason.trim().length < 3)}
          >
            {submitting ? "İşleniyor…" : copy.action}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function formatFullDate(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}
