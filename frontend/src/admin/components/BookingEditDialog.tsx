import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { motionDurations, motionEase } from "../../design-system/motion";
import type {
  AdminBooking,
  AdminBookingBoard,
  AdminManagedProfessional,
  AdminManagedService,
} from "../admin.types";
import {
  getAdminAvailability,
  getAdminProfessionals,
  getAdminServices,
  rescheduleAdminBooking,
  updateAdminBookingDetails,
} from "../api/adminApi";
import { formatMoney, formatTime } from "../lib/adminFormat";

type Props = {
  mode: "details" | "reschedule";
  booking: AdminBooking;
  board: AdminBookingBoard;
  onClose: () => void;
  onSaved: (booking: AdminBooking, message: string) => void;
};

export function BookingEditDialog({
  mode,
  booking,
  board,
  onClose,
  onSaved,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [fullName, setFullName] = useState(
    booking.customerNameSnapshot ?? booking.customer?.fullName ?? "",
  );
  const [phone, setPhone] = useState(
    booking.customerPhoneSnapshot ?? booking.customer?.phone ?? "",
  );
  const [customerNote, setCustomerNote] = useState(booking.customerNote ?? "");
  const [adminNote, setAdminNote] = useState(booking.adminNote ?? "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    booking.notificationsEnabled,
  );
  const [services, setServices] = useState<AdminManagedService[]>([]);
  const [professionals, setProfessionals] = useState<
    AdminManagedProfessional[]
  >([]);
  const [serviceIds, setServiceIds] = useState(
    booking.items.map((item) => item.serviceId),
  );
  const [professionalId, setProfessionalId] = useState(booking.professional.id);
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: board.branch.timezone,
    }).format(new Date(booking.startAt)),
  );
  const [startTime, setStartTime] = useState(() =>
    formatTime(booking.startAt, board.branch.timezone),
  );
  const [slots, setSlots] = useState<
    Array<{ startTime: string; endTime: string }>
  >([]);
  const [loading, setLoading] = useState(mode === "reschedule");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "reschedule") return;
    void Promise.all([
      getAdminServices(board.branch.id),
      getAdminProfessionals(board.branch.id),
    ])
      .then(([nextServices, nextProfessionals]) => {
        setServices(nextServices.filter((item) => item.isActive));
        setProfessionals(nextProfessionals.filter((item) => item.isActive));
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Katalog yüklenemedi.",
        ),
      )
      .finally(() => setLoading(false));
  }, [board.branch.id, mode]);

  useEffect(() => {
    if (mode !== "reschedule" || !serviceIds.length || !professionalId || !date)
      return;
    let active = true;
    setLoadingSlots(true);
    void getAdminAvailability({
      branchSlug: board.branch.slug,
      date,
      serviceIds,
      professionalId,
      excludeBookingId: booking.id,
    })
      .then((response) => {
        if (!active) return;
        setSlots(response.slots);
        if (!response.slots.some((slot) => slot.startTime === startTime)) {
          setStartTime("");
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Saatler yüklenemedi.",
          );
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [
    board.branch.slug,
    booking.id,
    date,
    mode,
    professionalId,
    serviceIds,
    startTime,
  ]);

  const eligibleProfessionals = useMemo(
    () =>
      professionals.filter((professional) =>
        serviceIds.every((serviceId) =>
          professional.serviceIds.includes(serviceId),
        ),
      ),
    [professionals, serviceIds],
  );
  const selectedServices = services.filter((service) =>
    serviceIds.includes(service.id),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated =
        mode === "details"
          ? await updateAdminBookingDetails(booking.id, {
              expectedRevision: booking.revision,
              fullName: fullName.trim(),
              ...(phone.trim() ? { phone: phone.trim() } : {}),
              customerNote: customerNote.trim() || undefined,
              adminNote: adminNote.trim() || undefined,
              notificationsEnabled: Boolean(
                phone.trim() && notificationsEnabled,
              ),
            })
          : await rescheduleAdminBooking(booking.id, {
              expectedRevision: booking.revision,
              serviceIds,
              professionalId,
              date,
              startTime,
            });
      onSaved(
        updated,
        mode === "details"
          ? "Randevu bilgileri güncellendi."
          : "Randevu yeni zamana güvenle taşındı.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "İşlem tamamlanamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="admin-action-layer booking-edit-layer"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        className="admin-action-backdrop"
        onClick={onClose}
        aria-label="Düzenleme formunu kapat"
      />
      <motion.form
        className="booking-edit-dialog"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-edit-title"
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: motionDurations.card, ease: motionEase }}
      >
        <header>
          <span>
            <small>{booking.publicCode}</small>
            <strong id="booking-edit-title">
              {mode === "details"
                ? "Randevu bilgilerini düzenle"
                : "Randevuyu taşı"}
            </strong>
          </span>
          <button type="button" onClick={onClose} aria-label="Kapat">
            <XIcon size={21} weight="bold" />
          </button>
        </header>

        {mode === "details" ? (
          <div className="booking-edit-dialog__body admin-form-grid">
            <label>
              <span>Ad soyad</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              <span>
                Telefon{" "}
                {booking.source === "WALK_IN" && <small>isteğe bağlı</small>}
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={30}
                inputMode="tel"
              />
            </label>
            <label className="is-full">
              <span>Müşteri notu</span>
              <textarea
                value={customerNote}
                onChange={(event) => setCustomerNote(event.target.value)}
                maxLength={1000}
              />
            </label>
            <label className="is-full">
              <span>Yönetici notu</span>
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                maxLength={1000}
              />
            </label>
            <label className="admin-switch-row is-full">
              <input
                type="checkbox"
                checked={notificationsEnabled && Boolean(phone.trim())}
                onChange={(event) =>
                  setNotificationsEnabled(event.target.checked)
                }
                disabled={!phone.trim()}
              />
              <span>
                <strong>SMS bildirimleri</strong>
                <small>Telefon yoksa otomatik kapalıdır.</small>
              </span>
            </label>
          </div>
        ) : (
          <div className="booking-edit-dialog__body">
            {loading ? (
              <div className="admin-skeleton admin-skeleton--cards" />
            ) : (
              <>
                <div className="manual-service-grid">
                  {services.map((service) => (
                    <button
                      type="button"
                      key={service.id}
                      className={
                        serviceIds.includes(service.id) ? "is-selected" : ""
                      }
                      onClick={() => {
                        setServiceIds((current) =>
                          current.includes(service.id)
                            ? current.filter((id) => id !== service.id)
                            : [...current, service.id],
                        );
                        setProfessionalId("");
                        setStartTime("");
                      }}
                    >
                      <span>
                        <strong>{service.name}</strong>
                        <small>{service.durationMinutes} dk</small>
                      </span>
                      <b>{formatMoney(service.priceKurus)}</b>
                      {serviceIds.includes(service.id) && (
                        <CheckCircleIcon size={19} weight="fill" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="admin-form-grid booking-reschedule-fields">
                  <label>
                    <span>Uzman</span>
                    <select
                      value={professionalId}
                      onChange={(event) => {
                        setProfessionalId(event.target.value);
                        setStartTime("");
                      }}
                    >
                      <option value="">Uzman seçin</option>
                      {eligibleProfessionals.map((professional) => (
                        <option value={professional.id} key={professional.id}>
                          {professional.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tarih</span>
                    <div className="admin-input-with-icon">
                      <CalendarBlankIcon size={18} />
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => {
                          setDate(event.target.value);
                          setStartTime("");
                        }}
                      />
                    </div>
                  </label>
                </div>
                <div className="manual-slot-grid">
                  {loadingSlots && (
                    <span className="admin-inline-loading">
                      <i /> Saatler hesaplanıyor
                    </span>
                  )}
                  {!loadingSlots && professionalId && !slots.length && (
                    <p className="admin-inline-empty">Uygun saat bulunmuyor.</p>
                  )}
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot.startTime}
                      className={
                        startTime === slot.startTime ? "is-selected" : ""
                      }
                      onClick={() => setStartTime(slot.startTime)}
                    >
                      <ClockIcon size={17} />
                      <strong>{slot.startTime}</strong>
                      <small>{slot.endTime}</small>
                    </button>
                  ))}
                </div>
                <aside className="manual-booking-summary">
                  <span>
                    <small>Yeni toplam</small>
                    <strong>
                      {formatMoney(
                        selectedServices.reduce(
                          (sum, item) => sum + item.priceKurus,
                          0,
                        ),
                      )}
                    </strong>
                  </span>
                  <span>
                    <small>Yeni süre</small>
                    <strong>
                      {selectedServices.reduce(
                        (sum, item) => sum + item.durationMinutes,
                        0,
                      )}{" "}
                      dk
                    </strong>
                  </span>
                  <span>
                    <small>Yeni saat</small>
                    <strong>{startTime || "—"}</strong>
                  </span>
                </aside>
              </>
            )}
          </div>
        )}
        {error && (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="admin-quiet-button"
            onClick={onClose}
            disabled={submitting}
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="admin-primary-button"
            disabled={
              submitting ||
              (mode === "reschedule" &&
                (!serviceIds.length || !professionalId || !startTime))
            }
          >
            {submitting
              ? "Kaydediliyor…"
              : mode === "details"
                ? "Bilgileri kaydet"
                : "Taşımayı onayla"}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}
