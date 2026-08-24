import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { motion, useReducedMotion } from "framer-motion";
import type { AdminBooking } from "../admin.types";
import { itemVariants } from "../../design-system/motion";
import {
  bookingServiceLabel,
  formatDateShort,
  formatTime,
} from "../lib/adminFormat";

type Props = {
  bookings: AdminBooking[];
  selectedId: string | null;
  timezone: string;
  pendingWarningMinutes: number;
  onSelect: (booking: AdminBooking) => void;
};

export function PendingQueue({
  bookings,
  selectedId,
  timezone,
  pendingWarningMinutes,
  onSelect,
}: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <aside
      className={`pending-queue${bookings.length ? "" : " pending-queue--empty"}`}
      aria-labelledby="pending-queue-title"
    >
      <header>
        <span>
          <small>Karar merkezi</small>
          <h2 id="pending-queue-title">Onay bekleyenler</h2>
        </span>
        <b aria-label={`${bookings.length} kayıt`}>{bookings.length}</b>
      </header>
      <div className="pending-queue__list">
        {!bookings.length && (
          <div className="admin-empty-state admin-empty-state--queue">
            <span>
              <ClockIcon size={24} weight="duotone" />
            </span>
            <strong>Bekleyen talep yok</strong>
            <p>Yeni talepler bu kuyrukta görünecek.</p>
          </div>
        )}
        {bookings.map((booking, index) => {
          const waitingMinutes = Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(booking.createdAt).getTime()) / 60_000,
            ),
          );
          const late = waitingMinutes >= pendingWarningMinutes;
          return (
            <motion.button
              className={`pending-card-button${selectedId === booking.id ? " is-selected" : ""}${late ? " is-late" : ""}`}
              type="button"
              key={booking.id}
              onClick={() => onSelect(booking)}
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              variants={itemVariants}
              transition={{
                delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.16),
              }}
            >
              <span className="pending-card-button__time">
                <strong>{formatTime(booking.startAt, timezone)}</strong>
                <small>{formatDateShort(booking.startAt)}</small>
              </span>
              <span className="pending-card-button__copy">
                <strong>
                  {booking.customer?.fullName ?? "Müşteri bilgisi bekleniyor"}
                </strong>
                <small>{bookingServiceLabel(booking)}</small>
                <em>{booking.professional.name}</em>
                <small className="pending-wait-time">
                  {waitingMinutes < 1
                    ? "Yeni geldi"
                    : `${waitingMinutes} dk bekliyor`}
                </small>
              </span>
              <span
                className="admin-status-dot admin-status-dot--pending"
                aria-label="Onay bekliyor"
              />
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}
