import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { TimerIcon } from "@phosphor-icons/react/dist/csr/Timer";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import type { AdminBooking, AdminBookingBoard } from "../admin.types";
import { bookingServiceLabel, formatTime } from "../lib/adminFormat";

type Props = { board: AdminBookingBoard };

export function AdminSummary({ board }: Props) {
  const nextBooking = board.day.bookings.find(
    (booking) => booking.id === board.summary.nextBookingId,
  );

  return (
    <section className="admin-summary" aria-label="Günün operasyon özeti">
      <SummaryCell
        icon={<TimerIcon size={22} weight="duotone" />}
        label="Onay bekleyen"
        value={String(board.summary.pendingTotal)}
        detail={
          board.summary.pendingTotal
            ? "Karar bekleyen talepler"
            : "Kuyruk temiz"
        }
        tone="pending"
      />
      <SummaryCell
        icon={<CheckCircleIcon size={22} weight="duotone" />}
        label="Günün akışı"
        value={String(board.summary.dayActiveTotal)}
        detail={`${board.summary.dayConfirmedTotal} onaylı randevu`}
        tone="active"
      />
      <SummaryCell
        icon={<ClockIcon size={22} weight="duotone" />}
        label="Sıradaki randevu"
        value={
          nextBooking
            ? formatTime(nextBooking.startAt, board.branch.timezone)
            : "—"
        }
        detail={
          nextBooking
            ? `${nextBooking.customer?.fullName ?? "Saat tutuluyor"} · ${bookingServiceLabel(nextBooking)}`
            : "Bugün sırada randevu yok"
        }
        tone="next"
        booking={nextBooking}
      />
      <SummaryCell
        icon={<UserIcon size={22} weight="duotone" />}
        label="Geçmiş akış"
        value={String(board.summary.pastTotal)}
        detail={`${board.summary.noShowTotal} gelmedi${board.summary.notificationFailures ? ` · ${board.summary.notificationFailures} bildirim hatası` : " · sistem sakin"}`}
        tone="operations"
      />
    </section>
  );
}

function SummaryCell({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: string;
  booking?: AdminBooking;
}) {
  return (
    <div className={`admin-summary__cell admin-summary__cell--${tone}`}>
      <span className="admin-summary__icon">{icon}</span>
      <span className="admin-summary__copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <em title={detail}>{detail}</em>
      </span>
    </div>
  );
}
