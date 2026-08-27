import { ArrowLeftIcon as ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CalendarBlankIcon as CalendarDays } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CheckCircleIcon as CheckCircle2 } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { SpinnerGapIcon as LoaderCircle } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { StarIcon as Star } from "@phosphor-icons/react/dist/csr/Star";
import { UserCircleIcon as UserRound } from "@phosphor-icons/react/dist/csr/UserCircle";
import { XCircleIcon as XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StudioWordmark } from "../components/brand/StudioWordmark";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  CustomerAccountApiError,
  getPublicReview,
  submitPublicReview,
} from "./customerAccountApi";
import type { CustomerReview } from "./customerAccountTypes";
import "./customerAccount.css";

export function PublicReviewPage() {
  const { token = "" } = useParams();
  const [review, setReview] = useState<CustomerReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canRetryLoad, setCanRetryLoad] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setCanRetryLoad(false);
    getPublicReview(token)
      .then((value) => {
        if (!active) return;
        setReview(value);
        setRating(value.rating ?? 0);
        setComment(value.comment ?? "");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(friendlyError(reason));
        setCanRetryLoad(isTransientError(reason));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [retryKey, token]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rating) {
      setError("Deneyimini 1 ile 5 yıldız arasında puanlamalısın.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await submitPublicReview(token, {
        rating,
        comment: comment.trim() || undefined,
      });
      setReview(response.review);
      setGoogleUrl(response.googleReviewUrl);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicActionShell>
      {loading ? (
        <ActionLoading />
      ) : error && !review ? (
        <ActionError
          message={error}
          onRetry={
            canRetryLoad ? () => setRetryKey((value) => value + 1) : undefined
          }
        />
      ) : review?.submittedAt ? (
        <ActionSuccess
          positive
          title="Teşekkür ederiz."
          message="Geri bildirimin salon ekibine ulaştı. Deneyimini daha iyi hâle getirmek için değerlendireceğiz."
          googleUrl={googleUrl}
        />
      ) : review ? (
        <form
          className="public-action-card public-review-card"
          onSubmit={(event) => void submit(event)}
        >
          <span className="public-action-icon">
            <Star />
          </span>
          <h1>Deneyimin nasıldı?</h1>
          <p className="public-action-lead">
            Puanın ve kısa yorumun doğrudan salon ekibine ulaşır.
          </p>
          <AppointmentSnapshot
            date={review.visitAt}
            professional={review.professional.name}
            services={review.services}
          />
          <fieldset className="public-rating">
            <legend>Puanın</legend>
            <div className="public-rating__options">
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className={`public-rating__option ${value <= rating ? "is-active" : ""}`}
                >
                  <input
                    className="ri-sr-only"
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => {
                      setRating(value);
                      setError("");
                    }}
                    aria-label={`${value} yıldız`}
                  />
                  <Star weight={value <= rating ? "fill" : "regular"} />
                </label>
              ))}
            </div>
            <p className="public-rating__meaning" aria-live="polite">
              {rating ? ratingLabels[rating] : "Bir puan seç"}
            </p>
          </fieldset>
          <div className="public-review-comment">
            <label htmlFor="public-review-comment">Kısa yorum</label>
            <span>İsteğe bağlı</span>
            <Textarea
              id="public-review-comment"
              name="comment"
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Karşılama, hizmet ve salon deneyimin…"
            />
          </div>
          {error && (
            <p className="public-action-error" role="alert">
              <XCircle />
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || !rating}
          >
            {busy ? <LoaderCircle className="is-spinning" /> : <Star />}
            {busy ? "Gönderiliyor…" : "Değerlendirmeyi gönder"}
          </Button>
          <small>
            Değerlendirmen yalnız salon ekibiyle paylaşılır; herkese açık
            yayımlanmaz.
          </small>
        </form>
      ) : null}
    </PublicActionShell>
  );
}

function PublicActionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-action-shell">
      <header>
        <Link to="/">
          <StudioWordmark />
        </Link>
        <Link to="/hesabim">
          <UserRound />
          Randevularım
        </Link>
      </header>
      <main>{children}</main>
      <footer>
        <span>Ramazan İnanç Hair Art Studio</span>
        <Link to="/">
          <ArrowLeft />
          Yeni randevu
        </Link>
      </footer>
    </div>
  );
}

function AppointmentSnapshot({
  date,
  professional,
  services,
}: {
  date: string;
  professional: string;
  services: string[];
}) {
  return (
    <div className="public-appointment-snapshot">
      <span>
        <CalendarDays />
        <b>{formatDate(date)}</b>
        <small>{formatTime(date)}</small>
      </span>
      <span>
        <UserRound />
        <b>{professional}</b>
        <small>{services.join(" · ")}</small>
      </span>
    </div>
  );
}

function ActionLoading() {
  return (
    <section
      className="public-action-card public-action-state"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="is-spinning" />
      <strong>Güvenli bağlantı kontrol ediliyor</strong>
    </section>
  );
}

function ActionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <section className="public-action-card public-action-state">
      <XCircle />
      <h1>Bağlantı kullanılamıyor</h1>
      <p>{message}</p>
      <div className="public-action-state__actions">
        {onRetry && <Button onClick={onRetry}>Tekrar dene</Button>}
        <Button variant={onRetry ? "outline" : "default"} asChild>
          <Link to="/hesabim">Randevularıma git</Link>
        </Button>
      </div>
    </section>
  );
}

function ActionSuccess({
  positive,
  title,
  message,
  googleUrl,
}: {
  positive: boolean;
  title: string;
  message: string;
  googleUrl?: string | null;
}) {
  return (
    <section
      className={`public-action-card public-action-state ${positive ? "is-positive" : ""}`}
    >
      {positive ? <CheckCircle2 /> : <XCircle />}
      <h1>{title}</h1>
      <p>{message}</p>
      {googleUrl && (
        <Button asChild>
          <a href={googleUrl} target="_blank" rel="noreferrer">
            Google’da da değerlendir
          </a>
        </Button>
      )}
      <Button variant="outline" asChild>
        <Link to="/hesabim">Randevularıma git</Link>
      </Button>
    </section>
  );
}

function friendlyError(reason: unknown) {
  if (isTransientError(reason)) {
    return "Salon sistemine şu anda ulaşılamıyor. İnternet bağlantını kontrol edip tekrar deneyebilirsin.";
  }
  return reason instanceof Error
    ? reason.message
    : "İşlem şu anda tamamlanamadı. Lütfen daha sonra tekrar dene.";
}

function isTransientError(reason: unknown) {
  if (reason instanceof CustomerAccountApiError) {
    return reason.status === 429 || reason.status >= 500;
  }
  if (reason instanceof TypeError) return true;
  return (
    reason instanceof Error &&
    /failed to fetch|network|load failed/i.test(reason.message)
  );
}

const ratingLabels: Record<number, string> = {
  1: "Beklentimin altındaydı",
  2: "Daha iyi olabilirdi",
  3: "Memnun kaldım",
  4: "Çok memnun kaldım",
  5: "Harikaydı",
};

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
