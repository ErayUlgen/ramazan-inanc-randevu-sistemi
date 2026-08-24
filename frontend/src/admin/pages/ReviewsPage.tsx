import { CheckIcon as Check } from "@phosphor-icons/react/dist/csr/Check";
import { ChatCircleTextIcon as MessageSquareText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { ArrowsClockwiseIcon as RefreshCw } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { StarIcon as Star } from "@phosphor-icons/react/dist/csr/Star";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import type {
  AdminReview,
  AdminReviewSummary,
  AdminRole,
} from "../admin.types";
import {
  getAdminReviews,
  getAdminReviewSummary,
  updateAdminReview,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";
import { useAdminRealtime } from "../hooks/useAdminRealtime";

type Props = {
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
  role?: AdminRole;
};

export function ReviewsPage({ onLogout, onNavigate, role }: Props) {
  const [summary, setSummary] = useState<AdminReviewSummary | null>(null);
  const [items, setItems] = useState<AdminReview[]>([]);
  const [rating, setRating] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [professionalOptions, setProfessionalOptions] = useState<
    AdminReviewSummary["professionals"]
  >([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [from, setFrom] = useState(() => reviewDate(-29));
  const [to, setTo] = useState(() => reviewDate(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, result] = await Promise.all([
        getAdminReviewSummary({ from, to, professionalId }),
        getAdminReviews({
          professionalId: professionalId || undefined,
          rating: rating ? Number(rating) : undefined,
          unread: unreadOnly || undefined,
          from,
          to,
        }),
      ]);
      setSummary(nextSummary);
      if (!professionalId) {
        setProfessionalOptions(nextSummary.professionals);
      }
      setItems(result.items);
      setNotes(
        Object.fromEntries(
          result.items.map((item) => [item.id, item.adminNote ?? ""]),
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Değerlendirmeler yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, professionalId, rating, to, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRealtime((event) => {
    if (event.resourceType === "BOOKING_REVIEW") void load();
  });

  return (
    <AdminPageFrame
      section="reviews"
      eyebrow="Geçmiş randevular"
      title="Değerlendirmeler"
      description="Geçmiş onaylı randevulardan gelen geri bildirimleri ve uzman puanlarını izle."
      onLogout={onLogout}
      onNavigate={onNavigate}
      role={role}
      actions={
        <div className="review-toolbar">
          <label>
            Başlangıç
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            Bitiş
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <label>
            Uzman
            <select
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
            >
              <option value="">Tüm uzmanlar</option>
              {professionalOptions.map((professional) => (
                <option
                  key={professional.professionalId}
                  value={professional.professionalId}
                >
                  {professional.professionalName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Puan
            <select
              value={rating}
              onChange={(event) => setRating(event.target.value)}
            >
              <option value="">Tümü</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} yıldız
                </option>
              ))}
            </select>
          </label>
          <label className="review-unread-filter">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            Yalnız okunmayan
          </label>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            aria-label="Değerlendirmeleri yenile"
          >
            <RefreshCw />
          </Button>
        </div>
      }
    >
      {error && (
        <AdminErrorBanner
          title="Değerlendirmeler açılamadı"
          error={error}
          fallback="Veriler şu anda alınamadı."
          onRetry={() => void load()}
        />
      )}
      {loading ? (
        <div className="review-center-grid">
          <div className="review-summary-card operation-card--skeleton" />
          <div className="review-list-card operation-card--skeleton" />
        </div>
      ) : (
        <>
          {summary && (
            <section
              className="review-metrics"
              aria-label="Değerlendirme özeti"
            >
              <article>
                <span>
                  <Star />
                </span>
                <small>Ortalama puan</small>
                <strong>{summary.averageRating.toFixed(1)} / 5</strong>
              </article>
              <article>
                <span>
                  <MessageSquareText />
                </span>
                <small>Yanıt oranı</small>
                <strong>%{Math.round(summary.responseRate * 100)}</strong>
              </article>
              <article>
                <span>
                  <Check />
                </span>
                <small>Gelen değerlendirme</small>
                <strong>{summary.submitted}</strong>
              </article>
              <article>
                <span>
                  <MessageSquareText />
                </span>
                <small>Okunmamış</small>
                <strong>{summary.unread}</strong>
              </article>
            </section>
          )}
          <div className="review-center-grid">
            <section className="review-summary-card">
              <header>
                <small>Puan dağılımı</small>
                <h2>Ziyaret memnuniyeti</h2>
              </header>
              <div className="review-distribution">
                {(summary?.distribution ?? []).map((row) => {
                  const width = summary?.submitted
                    ? (row.count / summary.submitted) * 100
                    : 0;
                  return (
                    <div key={row.rating}>
                      <b>
                        {row.rating}
                        <Star />
                      </b>
                      <span>
                        <i style={{ width: `${width}%` }} />
                      </span>
                      <strong>{row.count}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="review-ranking">
                <h3>Uzman ortalamaları</h3>
                {(summary?.professionals ?? []).map((item) => (
                  <div key={item.professionalId}>
                    <span>{item.professionalName}</span>
                    <strong>
                      {item.averageRating.toFixed(1)} · {item.reviewCount}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="review-list-card">
              <header>
                <small>Müşteri sesi</small>
                <h2>Son değerlendirmeler</h2>
              </header>
              {!items.length ? (
                <div className="review-empty">
                  <MessageSquareText />
                  <strong>Henüz değerlendirme yok</strong>
                  <p>
                    Geçmiş onaylı randevulardan gelen yanıtlar burada görünecek.
                  </p>
                </div>
              ) : (
                <div className="review-list">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className={item.adminReadAt ? "" : "is-unread"}
                    >
                      <header>
                        <span>
                          <strong>{item.customer.fullName}</strong>
                          <small>
                            {formatDate(item.visitAt)} ·{" "}
                            {item.professional.name}
                          </small>
                        </span>
                        <b aria-label={`${item.rating} yıldız`}>
                          {item.rating}
                          <Star fill="currentColor" />
                        </b>
                      </header>
                      <p>{item.comment || "Müşteri yalnızca puan bıraktı."}</p>
                      <small>{item.services.join(" · ")}</small>
                      {role !== "PROFESSIONAL" && (
                        <footer>
                          <input
                            value={notes[item.id] ?? ""}
                            onChange={(event) =>
                              setNotes((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="Ekip için iç not"
                            maxLength={500}
                          />
                          <Button
                            variant="outline"
                            onClick={() =>
                              void updateAdminReview(item.id, {
                                markRead: true,
                                adminNote: notes[item.id] ?? "",
                              })
                                .then((updated) => {
                                  setItems((current) =>
                                    current.map((entry) =>
                                      entry.id === item.id ? updated : entry,
                                    ),
                                  );
                                  toast.success(
                                    "Değerlendirme notu kaydedildi.",
                                  );
                                })
                                .catch((reason: unknown) =>
                                  setError(
                                    reason instanceof Error
                                      ? reason.message
                                      : "Not kaydedilemedi.",
                                  ),
                                )
                            }
                          >
                            <Check /> Kaydet ve okundu işaretle
                          </Button>
                        </footer>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </AdminPageFrame>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function reviewDate(offset: number) {
  const date = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}
