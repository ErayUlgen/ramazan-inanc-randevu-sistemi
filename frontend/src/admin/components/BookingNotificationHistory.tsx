import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ChatCircleTextIcon } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { useCallback, useEffect, useState } from "react";
import type { AdminBookingNotification } from "../admin.types";
import {
  getBookingNotifications,
  retryBookingNotification,
} from "../api/adminApi";

const EVENT_LABELS: Record<AdminBookingNotification["eventType"], string> = {
  BOOKING_RECEIVED: "Talep alındı",
  BOOKING_APPROVED: "Onay mesajı",
  BOOKING_REJECTED: "Ret mesajı",
  BOOKING_CANCELLED: "İptal mesajı",
  BOOKING_CREATED_BY_ADMIN: "Yönetici randevusu",
  BOOKING_RESCHEDULED: "Randevu değişikliği",
  BOOKING_REMINDER: "Randevu hatırlatması",
  CHANGE_REQUEST_RECEIVED: "Değişiklik talebi alındı",
  CHANGE_REQUEST_APPROVED: "Değişiklik onaylandı",
  CHANGE_REQUEST_REJECTED: "Değişiklik sonucu",
  WAITLIST_JOINED: "Bekleme listesine katılım",
  WAITLIST_OFFERED: "Uygun saat teklifi",
  WAITLIST_OFFER_ACCEPTED: "Saat teklifi kabul edildi",
  WAITLIST_OFFER_EXPIRED: "Saat teklifinin süresi doldu",
  REVIEW_REQUESTED: "Değerlendirme istendi",
  REVIEW_SUBMITTED: "Değerlendirme gönderildi",
  FORM_PENDING: "Form hatırlatması",
};

const STATUS_LABELS: Record<AdminBookingNotification["status"], string> = {
  PENDING: "Gönderim bekliyor",
  PROCESSING: "İşleniyor",
  SENT: "Gönderildi",
  DELIVERED: "Teslim edildi",
  RETRY_SCHEDULED: "Yeniden denenecek",
  FAILED: "Gönderilemedi",
  SKIPPED: "Gönderilmedi",
  CANCELLED: "İptal edildi",
};

export function BookingNotificationHistory({
  bookingId,
}: {
  bookingId: string;
}) {
  const [items, setItems] = useState<AdminBookingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getBookingNotifications(bookingId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Bildirim geçmişi yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = async (id: string) => {
    setRetryingId(id);
    setError("");
    try {
      const updated = await retryBookingNotification(id);
      setItems((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Bildirim yeniden kuyruğa alınamadı.",
      );
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section className="drawer-section drawer-notifications">
      <div className="drawer-notifications__heading">
        <h3>
          <ChatCircleTextIcon size={19} weight="duotone" /> İletişim
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Bildirim geçmişini yenile"
        >
          <ArrowClockwiseIcon
            className={loading ? "is-spinning" : ""}
            size={17}
            weight="bold"
          />
        </button>
      </div>
      {loading && !items.length ? (
        <div className="drawer-notifications__skeleton">
          <i />
          <i />
          <i />
        </div>
      ) : null}
      {error && (
        <p className="drawer-notifications__error" role="alert">
          <WarningCircleIcon size={17} />
          {error}
        </p>
      )}
      {!loading && !items.length && !error ? (
        <p className="drawer-notifications__empty">
          Bu randevu için henüz bildirim kaydı yok.
        </p>
      ) : null}
      {items.length ? (
        <ol className="drawer-notifications__list">
          {items.map((item) => {
            const tone =
              item.status === "SENT" || item.status === "DELIVERED"
                ? "sent"
                : item.status === "FAILED"
                  ? "failed"
                  : item.status === "SKIPPED" || item.status === "CANCELLED"
                    ? "muted"
                    : "pending";
            const canRetry = item.canRetry;
            return (
              <li
                key={item.id}
                className={`drawer-notification drawer-notification--${tone}`}
              >
                <span className="drawer-notification__icon">
                  {tone === "sent" ? (
                    <CheckCircleIcon size={18} weight="duotone" />
                  ) : tone === "failed" ? (
                    <WarningCircleIcon size={18} weight="duotone" />
                  ) : (
                    <ClockIcon size={18} weight="duotone" />
                  )}
                </span>
                <span>
                  <strong>
                    {EVENT_LABELS[item.eventType] ?? "Randevu bilgilendirmesi"}
                  </strong>
                  <small>
                    {STATUS_LABELS[item.status]} ·{" "}
                    {formatTimestamp(
                      item.sentAt ?? item.lastAttemptAt ?? item.createdAt,
                    )}
                  </small>
                  {item.provider && (
                    <small>
                      {item.provider} · {item.attemptCount}/{item.maxAttempts}{" "}
                      deneme
                    </small>
                  )}
                  {item.lastErrorMessage && <em>{item.lastErrorMessage}</em>}
                </span>
                {canRetry && (
                  <button
                    type="button"
                    onClick={() => void retry(item.id)}
                    disabled={retryingId === item.id}
                  >
                    {retryingId === item.id ? "İşleniyor…" : "Tekrar dene"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}
      <p className="drawer-notifications__truth">
        Gönderildi, SMS sağlayıcısının mesajı kabul ettiğini belirtir; teslim
        edildi anlamına gelmez.
      </p>
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
