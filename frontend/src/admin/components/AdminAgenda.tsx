import { CalendarBlankIcon as CalendarDays } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CaretRightIcon as ChevronRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { SpinnerGapIcon as LoaderCircle } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import type { AdminBooking } from "../admin.types";
import {
  bookingServiceLabel,
  formatDateLong,
  formatTime,
} from "../lib/adminFormat";
import { Button } from "../../components/ui/button";

export function AdminAgenda({
  bookings,
  loading,
  error,
  hasMore,
  onLoadMore,
  onSelect,
}: {
  bookings: AdminBooking[];
  loading: boolean;
  error: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelect: (booking: AdminBooking) => void;
}) {
  const groups = bookings.reduce<Map<string, AdminBooking[]>>(
    (result, booking) => {
      const date = new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Europe/Istanbul",
      }).format(new Date(booking.startAt));
      result.set(date, [...(result.get(date) ?? []), booking]);
      return result;
    },
    new Map(),
  );

  return (
    <section className="admin-agenda" aria-busy={loading}>
      <header>
        <span>
          <small>Yedi günlük görünüm</small>
          <h2>Haftalık agenda</h2>
        </span>
        <b>{bookings.length} randevu</b>
      </header>
      {error && (
        <p className="admin-agenda__error" role="alert">
          {error}
        </p>
      )}
      {loading && !bookings.length && (
        <div className="admin-agenda__loading">
          <LoaderCircle className="is-spinning" /> Randevular hazırlanıyor
        </div>
      )}
      {!loading && !error && !bookings.length && (
        <div className="admin-empty-state">
          <CalendarDays />
          <strong>Bu aralıkta randevu yok</strong>
          <p>Filtreleri değiştirerek farklı kayıtları arayabilirsin.</p>
        </div>
      )}
      <div className="admin-agenda__days">
        {[...groups.entries()].map(([date, items]) => (
          <section key={date}>
            <h3>
              {formatDateLong(date)}
              <b>{items.length}</b>
            </h3>
            <div>
              {items.map((booking) => (
                <button
                  type="button"
                  key={booking.id}
                  onClick={() => onSelect(booking)}
                >
                  <time>{formatTime(booking.startAt)}</time>
                  <span>
                    <strong>{booking.customerNameSnapshot ?? "Müşteri"}</strong>
                    <small>{bookingServiceLabel(booking)}</small>
                  </span>
                  <span>
                    <strong>{booking.professional.name}</strong>
                    <small>{sourceLabel(booking.source)}</small>
                  </span>
                  <em
                    className={`agenda-status is-${booking.status.toLowerCase()}`}
                  >
                    {statusLabel(booking.status)}
                  </em>
                  <ChevronRight />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {hasMore && (
        <footer>
          <Button variant="outline" disabled={loading} onClick={onLoadMore}>
            {loading ? "Yükleniyor…" : "Daha fazla göster"}
          </Button>
        </footer>
      )}
    </section>
  );
}

function sourceLabel(value: AdminBooking["source"]) {
  return {
    ONLINE: "Online",
    PHONE: "Telefon",
    ADMIN: "Yönetici",
    WALK_IN: "Salondan",
  }[value];
}

function statusLabel(value: AdminBooking["status"]) {
  return {
    HOLD: "Tutuluyor",
    PENDING_APPROVAL: "Onay bekliyor",
    CONFIRMED: "Onaylandı",
    REJECTED: "Onaylanmadı",
    CANCELLED: "İptal",
    EXPIRED: "Süresi doldu",
  }[value];
}
