import { CheckIcon as Check } from "@phosphor-icons/react/dist/csr/Check";
import { ChatCircleTextIcon as MessageSquareText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { ArrowsClockwiseIcon as RefreshCw } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { StarIcon as Star } from "@phosphor-icons/react/dist/csr/Star";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
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
    >
      {error && (
        <AdminErrorBanner
          title="Değerlendirmeler açılamadı"
          error={error}
          fallback="Veriler şu anda alınamadı."
          onRetry={() => void load()}
        />
      )}
      <section className="service-workbench reviews-workbench" aria-label="Değerlendirmeler">
        <div className="reviews-toolbar">
          <div className="reviews-toolbar__filters">
            <label className="service-field">
              <span>Başlangıç</span>
              <Input
                id="reviews-filter-from"
                name="from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="service-field">
              <span>Bitiş</span>
              <Input
                id="reviews-filter-to"
                name="to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <label className="service-field">
              <span>Uzman</span>
              <select
                id="reviews-filter-professional"
                name="professionalId"
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
            <label className="service-field">
              <span>Puan</span>
              <select
                id="reviews-filter-rating"
                name="rating"
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
            <label className="reviews-unread-filter">
              <Checkbox
                checked={unreadOnly}
                onCheckedChange={(checked) => setUnreadOnly(checked === true)}
              />
              <span>Yalnız okunmayan</span>
            </label>
          </div>
          <button
            type="button"
            className="reviews-refresh"
            onClick={() => void load()}
            aria-label="Değerlendirmeleri yenile"
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>

        {summary && (
          <dl className="reviews-metrics" aria-label="Değerlendirme özeti">
            <div>
              <dt>Ortalama puan</dt>
              <dd>{summary.averageRating.toFixed(1)}/5</dd>
            </div>
            <div>
              <dt>Yanıt oranı</dt>
              <dd>%{Math.round(summary.responseRate * 100)}</dd>
            </div>
            <div>
              <dt>Gelen değerlendirme</dt>
              <dd>{summary.submitted}</dd>
            </div>
            <div>
              <dt>Okunmamış</dt>
              <dd>{summary.unread}</dd>
            </div>
          </dl>
        )}

        {loading ? (
          <div className="admin-skeleton admin-skeleton--cards reviews-skeleton" />
        ) : (
          <div className="reviews-content-grid">
            <section className="reviews-summary" aria-labelledby="reviews-distribution-title">
              <header>
                <small>Puan dağılımı</small>
                <strong id="reviews-distribution-title">Ziyaret memnuniyeti</strong>
              </header>
              <div className="reviews-distribution">
                {(summary?.distribution ?? []).map((row) => {
                  const width = summary?.submitted
                    ? (row.count / summary.submitted) * 100
                    : 0;
                  return (
                    <div key={row.rating}>
                      <b>
                        {row.rating}
                        <Star weight="fill" aria-hidden="true" />
                      </b>
                      <span>
                        <i style={{ width: `${width}%` }} />
                      </span>
                      <strong>{row.count}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="reviews-ranking">
                <p className="reviews-ranking__label">Uzman ortalamaları</p>
                {(summary?.professionals ?? []).map((item) => (
                  <div key={item.professionalId}>
                    <span>{item.professionalName}</span>
                    <span className="reviews-ranking__stat">
                      <strong>
                        <Star weight="fill" aria-hidden="true" />
                        {item.averageRating.toFixed(1)}
                      </strong>
                      <small>
                        {item.reviewCount === 0
                          ? "Henüz değerlendirme yok"
                          : `${item.reviewCount} değerlendirme`}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="reviews-list-panel" aria-labelledby="reviews-list-title">
              <header>
                <small>Müşteri sesi</small>
                <strong id="reviews-list-title">Son değerlendirmeler</strong>
              </header>
              {!items.length ? (
                <div className="service-catalog-empty">
                  <MessageSquareText size={26} weight="duotone" aria-hidden="true" />
                  <strong>Henüz değerlendirme yok</strong>
                  <p>
                    Geçmiş onaylı randevulardan gelen yanıtlar burada görünecek.
                  </p>
                </div>
              ) : (
                <div className="reviews-list">
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
                          <Star weight="fill" aria-hidden="true" />
                        </b>
                      </header>
                      <p>{item.comment || "Müşteri yalnızca puan bıraktı."}</p>
                      <small>{item.services.join(" · ")}</small>
                      {role !== "PROFESSIONAL" && (
                        <footer>
                          <Input
                            name={`review-note-${item.id}`}
                            aria-label="Ekip için iç not"
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
        )}
      </section>
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
