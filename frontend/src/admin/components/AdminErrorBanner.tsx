import { ArrowsClockwiseIcon as RefreshCw } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { WarningIcon as TriangleAlert } from "@phosphor-icons/react/dist/csr/Warning";
import { Button } from "../../components/ui/button";

type Props = {
  title: string;
  error: string;
  fallback: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function AdminErrorBanner({
  title,
  error,
  fallback,
  onRetry,
  retryLabel = "Yeniden dene",
}: Props) {
  const friendly = humanizeAdminError(error, fallback);

  return (
    <section className="admin-error-banner" role="alert" aria-live="assertive">
      <span className="admin-error-banner__icon" aria-hidden="true">
        <TriangleAlert />
      </span>
      <span className="admin-error-banner__copy">
        <strong>
          {friendly.isScheduleConflict ? "Bu saat artık müsait değil" : title}
        </strong>
        <small>{friendly.message}</small>
      </span>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw />
          {friendly.isScheduleConflict ? "Takvimi yenile" : retryLabel}
        </Button>
      )}
    </section>
  );
}

function humanizeAdminError(error: string, fallback: string) {
  const normalized = error.trim();
  const isScheduleConflict =
    /başka bir randevu|önce dolduruldu|artık uygun değil|zaman bloğu|çakış/i.test(
      normalized,
    );

  if (isScheduleConflict) {
    return {
      isScheduleConflict: true,
      message:
        "Takvim az önce değişti. Yenileyip uygun saatlerden birini seçebilirsin.",
    };
  }

  if (
    /failed to fetch|network|bağlantı|sunucuya ulaşılam|service unavailable/i.test(
      normalized,
    )
  ) {
    return {
      isScheduleConflict: false,
      message:
        "Sunucuya şu an ulaşamıyoruz. Bağlantını kontrol edip birkaç saniye sonra yeniden deneyebilirsin.",
    };
  }

  if (/unauthorized|401|oturum|session/i.test(normalized)) {
    return {
      isScheduleConflict: false,
      message:
        "Oturumun sona ermiş olabilir. Sayfayı yenileyip yeniden giriş yapabilirsin.",
    };
  }

  return {
    isScheduleConflict: false,
    message:
      normalized &&
      normalized.length <= 180 &&
      !/\b(?:500|stack|exception)\b/i.test(normalized)
        ? normalized
        : fallback,
  };
}
