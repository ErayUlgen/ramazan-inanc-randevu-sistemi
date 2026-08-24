import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { useEffect, useState } from "react";
import type { AdminAuditEvent } from "../admin.types";
import { getBookingAudit } from "../api/adminApi";

const ACTION_LABELS: Record<string, string> = {
  ONLINE_BOOKING_REQUESTED: "Online randevu talebi oluşturuldu",
  BOOKING_CREATED_BY_ADMIN: "Yönetici randevu oluşturdu",
  BOOKING_APPROVED: "Randevu onaylandı",
  BOOKING_REJECTED: "Randevu reddedildi",
  BOOKING_CANCELLED: "Randevu iptal edildi",
  BOOKING_RESCHEDULED: "Randevu taşındı",
  BOOKING_DETAILS_UPDATED: "Randevu bilgileri güncellendi",
  VISIT_STATUS_CHANGED: "Ziyaret durumu güncellendi",
  VISIT_STATUS_CORRECTED: "Ziyaret durumu düzeltildi",
};

export function BookingAuditHistory({ bookingId }: { bookingId: string }) {
  const [items, setItems] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getBookingAudit(bookingId)
      .then((events) => {
        if (active) setItems(events);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "İşlem geçmişi yüklenemedi.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, reload]);

  return (
    <section className="drawer-section booking-audit-history">
      <h3>
        <ClockCounterClockwiseIcon size={18} /> İşlem geçmişi
      </h3>
      {loading && (
        <p className="admin-inline-loading">
          <i /> Geçmiş yükleniyor
        </p>
      )}
      {error && (
        <div className="admin-inline-error">
          <span>{error}</span>
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            <ArrowClockwiseIcon size={16} /> Yenile
          </button>
        </div>
      )}
      {!loading && !error && !items.length && (
        <p className="admin-inline-empty">
          Bu kayıt için henüz yapılandırılmış işlem geçmişi yok.
        </p>
      )}
      {!loading && !error && items.length > 0 && (
        <ol>
          {items.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{ACTION_LABELS[item.action] ?? item.action}</strong>
                <small>
                  {item.actorType === "ADMIN"
                    ? "Yönetici"
                    : item.actorType === "CUSTOMER"
                      ? "Müşteri"
                      : "Sistem"}{" "}
                  · {formatTimestamp(item.createdAt)}
                </small>
                {item.reason && <em>{item.reason}</em>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
