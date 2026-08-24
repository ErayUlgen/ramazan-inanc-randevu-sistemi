import { CalendarBlankIcon as CalendarDays } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { ChartBarIcon as ChartNoAxesColumnIncreasing } from "@phosphor-icons/react/dist/csr/ChartBar";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import { ListChecksIcon as ListChecks } from "@phosphor-icons/react/dist/csr/ListChecks";
import { StarIcon as Star } from "@phosphor-icons/react/dist/csr/Star";
import { UserCheckIcon as UserCheck } from "@phosphor-icons/react/dist/csr/UserCheck";
import { WalletIcon as WalletCards } from "@phosphor-icons/react/dist/csr/Wallet";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProfessionalAvatar } from "../../components/ui/ProfessionalAvatar";
import type { AdminOperationsReport } from "../admin.types";
import { getAdminOperationsReport } from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";
import { formatMoney } from "../lib/adminFormat";

type Props = {
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
};

export function ReportsPage({ onLogout, onNavigate }: Props) {
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(daysAgo(0));
  const [report, setReport] = useState<AdminOperationsReport | null>(null);
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [source, setSource] = useState("");
  const [visitStatus, setVisitStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const nextReport = await getAdminOperationsReport(
        from,
        to,
        professionalId || undefined,
        serviceId || undefined,
        {
          source: source || undefined,
          visitStatus: visitStatus || undefined,
        },
      );
      if (
        requestId !== requestSequence.current ||
        nextReport.range.from !== from ||
        nextReport.range.to !== to
      ) {
        return;
      }
      setReport(nextReport);
    } catch (requestError) {
      if (requestId !== requestSequence.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Rapor yüklenemedi.",
      );
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [from, to, professionalId, serviceId, source, visitStatus]);
  useEffect(() => {
    void load();
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  return (
    <AdminPageFrame
      section="reports"
      eyebrow="Operasyon görünümü"
      title="Raporlar"
      description="Seçtiğin tarih aralığındaki randevu, doluluk ve hizmet sonuçlarını izle."
      onLogout={onLogout}
      onNavigate={onNavigate}
      actions={
        <div className="report-range">
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
        </div>
      }
    >
      {error && (
        <AdminErrorBanner
          title="Rapor hazırlanamadı"
          error={error}
          fallback="Raporu şu an hazırlayamadık. Tarih aralığını kontrol edip yeniden deneyebilirsin."
          onRetry={() => void load()}
          retryLabel="Raporu yenile"
        />
      )}
      {loading || !report ? (
        <div className="report-grid">
          <div className="report-card operation-card--skeleton" />
          <div className="report-card operation-card--skeleton" />
        </div>
      ) : (
        <>
          <section className="report-filter-bar">
            <label>
              Uzman
              <select
                value={professionalId}
                onChange={(event) => setProfessionalId(event.target.value)}
              >
                <option value="">Tüm uzmanlar</option>
                {report.professionals.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hizmet
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
              >
                <option value="">Tüm hizmetler</option>
                {report.services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kaynak
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                <option value="">Tüm kaynaklar</option>
                <option value="ONLINE">Online</option>
                <option value="PHONE">Telefon</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="ADMIN">Yönetici</option>
              </select>
            </label>
            <label>
              İstisna
              <select
                value={visitStatus}
                onChange={(event) => setVisitStatus(event.target.value)}
              >
                <option value="">Tüm randevular</option>
                <option value="NO_SHOW">Gelmedi</option>
              </select>
            </label>
          </section>
          <section className="report-kpis report-kpis--expanded">
            <Kpi
              icon={<CalendarDays />}
              label="Toplam randevu"
              value={report.totals.appointments}
            />
            <Kpi
              icon={<ListChecks />}
              label="Onay bekleyen"
              value={report.totals.pending}
            />
            <Kpi
              icon={<UserCheck />}
              label="Geçmiş onaylı"
              value={report.totals.past}
            />
            <Kpi
              icon={<ChartNoAxesColumnIncreasing />}
              label="Doluluk"
              value={`%${report.totals.occupancyPercent}`}
            />
            <Kpi
              icon={<Clock3 />}
              label="Ort. onay"
              value={
                report.totals.averageApprovalMinutes == null
                  ? "—"
                  : `${report.totals.averageApprovalMinutes} dk`
              }
            />
            <Kpi
              icon={<Star />}
              label="Ortalama puan"
              value={`${report.totals.averageRating.toFixed(1)} / 5`}
            />
            <Kpi
              icon={<WalletCards />}
              label="Tahmini hizmet değeri"
              value={formatMoney(
                report.totals.estimatedPastServiceValueKurus,
              )}
            />
            <Kpi
              icon={<WalletCards />}
              label="Planlanan hizmet değeri"
              value={formatMoney(report.totals.plannedServiceValueKurus)}
            />
          </section>
          <div className="report-grid">
            <section className="report-card">
              <header>
                <span>
                  <small>Günlük eğilim</small>
                  <h2>Randevu ritmi</h2>
                </span>
              </header>
              <div className="trend-bars">
                {report.trend.length ? (
                  report.trend.map((item) => {
                    const max = Math.max(
                      ...report.trend.map((point) => point.count),
                      1,
                    );
                    return (
                      <span key={item.date}>
                        <i
                          style={{
                            height: `${Math.max(8, (item.count / max) * 100)}%`,
                          }}
                        />
                        <b>{item.count}</b>
                        <small>{formatDay(item.date)}</small>
                      </span>
                    );
                  })
                ) : (
                  <p>Bu aralıkta randevu yok.</p>
                )}
              </div>
            </section>
            <section className="report-card">
              <header>
                <span>
                  <small>Ekip</small>
                  <h2>Uzman doluluğu</h2>
                </span>
              </header>
              <div className="report-ranking">
                {report.professionals.map((item) => (
                  <div key={item.id}>
                    <ProfessionalAvatar name={item.name} size="sm" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.count} randevu · {Math.round(item.minutes)} dk
                      </small>
                    </span>
                    <b>%{item.occupancyPercent}</b>
                    <i>
                      <em
                        style={{
                          width: `${Math.min(item.occupancyPercent, 100)}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
              </div>
            </section>
            <section className="report-card">
              <header>
                <span>
                  <small>Hizmetler</small>
                  <h2>Tercih dağılımı</h2>
                </span>
              </header>
              <div className="report-table">
                {report.services.map((item, index) => (
                  <div key={item.id}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <strong>{item.name}</strong>
                    <span>{item.count}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="report-card report-card--summary">
              <header>
                <span>
                  <small>Sonuçlar</small>
                  <h2>Operasyon özeti</h2>
                </span>
              </header>
              <dl>
                <div>
                  <dt>Gerçek kapasite</dt>
                  <dd>{report.totals.capacityMinutes} dk</dd>
                </div>
                <div>
                  <dt>Meşgul süre</dt>
                  <dd>{report.totals.occupiedMinutes} dk</dd>
                </div>
                <div>
                  <dt>Gelmeme oranı</dt>
                  <dd>%{report.totals.noShowRate}</dd>
                </div>
                <div>
                  <dt>İptal oranı</dt>
                  <dd>%{report.totals.cancellationRate}</dd>
                </div>
                <div>
                  <dt>Tekrarlayan randevu</dt>
                  <dd>%{report.totals.recurringBookingRate}</dd>
                </div>
                <div>
                  <dt>Bekleme listesinden kazanılan</dt>
                  <dd>{report.totals.waitlistWon}</dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      )}
    </AdminPageFrame>
  );
}
function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <article>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}
function daysAgo(amount: number) {
  const date = new Date(Date.now() - amount * 86_400_000);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}
function formatDay(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00+03:00`));
}
