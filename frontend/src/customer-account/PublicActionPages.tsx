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
import {
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

  useEffect(() => {
    let active = true;
    getPublicReview(token)
      .then((value) => {
        if (!active) return;
        setReview(value);
        setRating(value.rating ?? 0);
        setComment(value.comment ?? "");
      })
      .catch((reason: unknown) => active && setError(friendlyError(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async () => {
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
        <ActionError message={error} />
      ) : review?.submittedAt ? (
        <ActionSuccess
          positive
          title="Teşekkür ederiz."
          message="Geri bildirimin salon ekibine ulaştı. Deneyimini daha iyi hâle getirmek için değerlendireceğiz."
          googleUrl={googleUrl}
        />
      ) : review ? (
        <section className="public-action-card public-review-card">
          <span className="public-action-icon">
            <Star />
          </span>
          <p className="customer-eyebrow">Doğrulanmış randevu</p>
          <h1>Deneyimin nasıldı?</h1>
          <p className="public-action-lead">
            Kısa geri bildirimin ekibimizin daha iyi hizmet vermesine yardımcı
            olur.
          </p>
          <AppointmentSnapshot
            date={review.visitAt}
            professional={review.professional.name}
            services={review.services}
          />
          <p className="public-review-professional">
            <span>Değerlendirilen uzman</span>
            <strong>{review.professional.name}</strong>
          </p>
          <fieldset className="public-rating">
            <legend>Puanın</legend>
            <div>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value <= rating ? "is-active" : ""}
                  onClick={() => setRating(value)}
                  aria-label={`${value} yıldız`}
                >
                  <Star fill={value <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="public-review-comment">
            Kısa yorum <span>İsteğe bağlı</span>
            <textarea
              maxLength={600}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Karşılama, hizmet ve salon deneyimin…"
            />
          </label>
          {error && (
            <p className="public-action-error" role="alert">
              <XCircle />
              {error}
            </p>
          )}
          <Button
            disabled={busy || !rating}
            onClick={() => void submit()}
          >
            {busy ? <LoaderCircle className="is-spinning" /> : <Star />}
            Değerlendirmeyi gönder
          </Button>
          <small>
            Değerlendirmen yalnız salon ekibiyle paylaşılır; herkese açık
            yayımlanmaz.
          </small>
        </section>
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
    <section className="public-action-card public-action-state">
      <LoaderCircle className="is-spinning" />
      <strong>Güvenli bağlantı kontrol ediliyor</strong>
    </section>
  );
}

function ActionError({ message }: { message: string }) {
  return (
    <section className="public-action-card public-action-state">
      <XCircle />
      <h1>Bağlantı kullanılamıyor</h1>
      <p>{message}</p>
      <Button asChild>
        <Link to="/hesabim">Randevularıma git</Link>
      </Button>
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
  return reason instanceof Error
    ? reason.message
    : "İşlem şu anda tamamlanamadı. Lütfen daha sonra tekrar dene.";
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
