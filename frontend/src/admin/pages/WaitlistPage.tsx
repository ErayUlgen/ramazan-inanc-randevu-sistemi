import { ArrowClockwiseIcon as ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CalendarDotsIcon as CalendarClock } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import { ListPlusIcon as ListPlus } from "@phosphor-icons/react/dist/csr/ListPlus";
import { UserCheckIcon as UserRoundCheck } from "@phosphor-icons/react/dist/csr/UserCheck";
import { UsersThreeIcon as UsersThree } from "@phosphor-icons/react/dist/csr/UsersThree";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import type {
  AdminWaitlistEntry,
  AdminWaitlistSuggestion,
} from "../admin.types";
import {
  cancelAdminWaitlistEntry,
  createAdminWaitlistSuggestionOffer,
  getAdminWaitlist,
  getAdminWaitlistSuggestions,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";

type Props = {
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  OFFERED: "Teklif verilen",
  FULFILLED: "Randevuya dönüşen",
  EXPIRED: "Süresi dolan",
  CANCELLED: "İptal edilen",
};

export function WaitlistPage({ branchId, onLogout, onNavigate }: Props) {
  const [status, setStatus] = useState("ACTIVE");
  const [items, setItems] = useState<AdminWaitlistEntry[]>([]);
  const [suggestions, setSuggestions] = useState<AdminWaitlistSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<AdminWaitlistSuggestion | null>(null);
  const [submittingEntryId, setSubmittingEntryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<AdminWaitlistEntry | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [entries, openedSlots] = await Promise.all([
        getAdminWaitlist(branchId, status),
        getAdminWaitlistSuggestions(),
      ]);
      setItems(entries);
      setSuggestions(openedSlots);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Bekleme listesi yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const createOffer = async (entryId: string) => {
    if (!selectedSuggestion) return;
    setSubmittingEntryId(entryId);
    setError("");
    try {
      await createAdminWaitlistSuggestionOffer(selectedSuggestion.id, entryId);
      toast.success(
        `Saat ${selectedSuggestion.offerTtlMinutes} dakika ayrıldı. Güvenli kabul bağlantısı müşteriye SMS ile gönderildi.`,
      );
      setSelectedSuggestion(null);
      await load();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Teklif oluşturulamadı.";
      setError(message);
      toast.error(message);
      await load();
    } finally {
      setSubmittingEntryId("");
    }
  };

  return (
    <AdminPageFrame
      section="waitlist"
      eyebrow="Kapasite geri kazanımı"
      title="Bekleme listesi"
      description="Boşalan saati gör, uygun müşteriyi seç; SMS yalnız sen teklif verdiğinde gitsin."
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      {error && (
        <AdminErrorBanner
          title="Bekleme listesi yenilenemedi"
          error={error}
          fallback="Bekleme listesini şu an yükleyemedik. Birkaç saniye sonra yeniden deneyebilirsin."
          onRetry={() => void load()}
          retryLabel="Listeyi yenile"
        />
      )}

      <section className="waitlist-openings" aria-labelledby="opened-slots-title">
        <header className="waitlist-openings__header">
          <span className="waitlist-openings__mark" aria-hidden="true">
            <CalendarClock weight="duotone" />
          </span>
          <span>
            <small>Teklif merkezi</small>
            <h2 id="opened-slots-title">Açılan saatler</h2>
            <p>
              İptal veya değişiklik sonrası açılan gerçek saatler. Sistem kendi
              kendine müşteriye mesaj göndermez.
            </p>
          </span>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <ArrowClockwise /> Yenile
          </Button>
        </header>

        {loading ? (
          <div className="admin-skeleton admin-skeleton--cards" />
        ) : suggestions.length ? (
          <div className="waitlist-opening-list">
            {suggestions.map((suggestion) => (
              <article className="waitlist-opening-card" key={suggestion.id}>
                <time dateTime={suggestion.startAt}>
                  <strong>{formatTime(suggestion.startAt)}</strong>
                  <span>{formatDate(suggestion.startAt)}</span>
                </time>
                <span className="waitlist-opening-card__detail">
                  <small>Boşalan saat</small>
                  <strong>
                    {suggestion.professional?.name ?? "Uygun uzman seçilecek"}
                  </strong>
                  <span>
                    {formatTime(suggestion.startAt)}–
                    {formatTime(suggestion.endAt)} · {suggestion.capacityMinutes} dk
                  </span>
                </span>
                <span className="waitlist-opening-card__match">
                  <UsersThree weight="duotone" aria-hidden="true" />
                  <strong>{suggestion.candidates.length}</strong>
                  <small>uygun müşteri</small>
                </span>
                <Button
                  variant={suggestion.candidates.length ? "default" : "outline"}
                  disabled={!suggestion.candidates.length}
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  {suggestion.candidates.length
                    ? "Müşteri seç"
                    : "Eşleşme yok"}
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="waitlist-openings__empty">
            <Clock3 weight="duotone" aria-hidden="true" />
            <span>
              <strong>Şu anda değerlendirecek boşluk yok</strong>
              <small>
                Bir randevu iptal edildiğinde veya başka saate taşındığında
                açılan saat burada görünür.
              </small>
            </span>
          </div>
        )}
      </section>

      <section className="service-workbench" aria-label="Bekleme kayıtları">
        <div className="service-workbench__toolbar">
          <select
            className="admin-filter-select waitlist-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Bekleme listesi durumu"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <dl
            className="service-workbench__summary"
            aria-label="Bekleme listesi özeti"
          >
            <div>
              <dt>{STATUS_LABELS[status]}</dt>
              <dd>{loading ? "–" : items.length}</dd>
            </div>
          </dl>
        </div>

        {loading ? (
          <div className="admin-skeleton admin-skeleton--cards" />
        ) : items.length ? (
          <div className="waitlist-list">
            {items.map((entry) => (
              <article className="waitlist-card" key={entry.id}>
                <header>
                  <span className="waitlist-card__mark" aria-hidden="true">
                    <ListPlus />
                  </span>
                  <span className="waitlist-card__identity">
                    <small>{entry.phoneMasked}</small>
                    <strong>{entry.fullName}</strong>
                    <span>
                      {entry.services.map((service) => service.name).join(" · ")}
                    </span>
                  </span>
                  <b
                    className={`waitlist-card__status is-${entry.status.toLowerCase()}`}
                  >
                    {STATUS_LABELS[entry.status] ?? entry.status}
                  </b>
                </header>
                <div className="waitlist-preferences">
                  <span>
                    <CalendarClock aria-hidden="true" />
                    <small>Tarih</small>
                    <strong>
                      {entry.dateFrom === entry.dateTo
                        ? formatDateKey(entry.dateFrom)
                        : `${formatDateKey(entry.dateFrom)} – ${formatDateKey(entry.dateTo)}`}
                    </strong>
                  </span>
                  <span>
                    <Clock3 aria-hidden="true" />
                    <small>Saat aralığı</small>
                    <strong>
                      {minuteLabel(entry.startMinute)}–
                      {minuteLabel(entry.endMinute)}
                    </strong>
                  </span>
                  <span>
                    <UserRoundCheck aria-hidden="true" />
                    <small>Uzman</small>
                    <strong>
                      {entry.professional?.name ?? "İlk müsait uzman"}
                    </strong>
                  </span>
                </div>
                {entry.offers[0] && (
                  <p className="waitlist-card__note">
                    <strong>Son teklif</strong>
                    {formatDateTime(entry.offers[0].startAt)} ·{" "}
                    {entry.offers[0].professional.name} ·{" "}
                    {offerStatusLabel(entry.offers[0].status)}
                  </p>
                )}
                <footer>
                  <span>
                    {entry.failedOfferCount
                      ? `${entry.failedOfferCount} yanıtlanmayan teklif`
                      : entry.status === "ACTIVE"
                        ? "Uygun boşluk bekleniyor"
                        : "Teklif geçmişi güncel"}
                  </span>
                  {(["ACTIVE", "OFFERED"] as string[]).includes(entry.status) && (
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setCancelTarget(entry)}
                      >
                        <X /> Kaydı kapat
                      </Button>
                    </div>
                  )}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="service-catalog-empty">
            <ListPlus size={26} weight="duotone" aria-hidden="true" />
            <strong>{emptyStateCopy(status).title}</strong>
            <p>{emptyStateCopy(status).body}</p>
          </div>
        )}
      </section>

      <SuggestionDialog
        suggestion={selectedSuggestion}
        submittingEntryId={submittingEntryId}
        onOpenChange={(open) => !open && setSelectedSuggestion(null)}
        onOffer={(entryId) => void createOffer(entryId)}
      />

      <CancelWaitlistDialog
        entry={cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onCancelled={() => {
          setCancelTarget(null);
          toast.success("Bekleme kaydı kapatıldı.");
          void load();
        }}
        onError={setError}
      />
    </AdminPageFrame>
  );
}

function SuggestionDialog({
  suggestion,
  submittingEntryId,
  onOpenChange,
  onOffer,
}: {
  suggestion: AdminWaitlistSuggestion | null;
  submittingEntryId: string;
  onOpenChange: (open: boolean) => void;
  onOffer: (entryId: string) => void;
}) {
  return (
    <Dialog open={Boolean(suggestion)} onOpenChange={onOpenChange}>
      <DialogContent className="waitlist-candidate-dialog">
        <DialogHeader>
          <DialogTitle>Teklif göndereceğin müşteriyi seç</DialogTitle>
          <DialogDescription>
            {suggestion
              ? `${formatDateTime(suggestion.startAt)} için yalnız tercihleri ve hizmet süresi gerçekten uyan müşteriler gösteriliyor.`
              : "Uygun müşteriler yükleniyor."}
          </DialogDescription>
        </DialogHeader>
        <div className="waitlist-candidate-dialog__notice" role="note">
          <Clock3 weight="duotone" aria-hidden="true" />
          <p>
            <strong>
              Teklif gönderince saat {suggestion?.offerTtlMinutes ?? 15} dakika
              tutulur.
            </strong>{" "}
            Müşteri SMS bağlantısından kabul ederse randevu doğrudan kesinleşir;
            ikinci bir yönetici onayı istenmez.
          </p>
        </div>
        <div className="waitlist-candidate-list">
          {suggestion?.candidates.map((candidate, index) => (
            <article className="waitlist-candidate" key={candidate.entryId}>
              <span className="waitlist-candidate__rank" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="waitlist-candidate__identity">
                <strong>{candidate.fullName}</strong>
                <small>{candidate.phoneMasked}</small>
                <span>{candidate.services.map((item) => item.name).join(" · ")}</span>
              </span>
              <dl className="waitlist-candidate__facts">
                <div>
                  <dt>Randevu</dt>
                  <dd>
                    {candidate.offeredProfessional.name} ·{" "}
                    {candidate.totalDurationMinutes} dk
                  </dd>
                </div>
                <div>
                  <dt>Müşteri tercihi</dt>
                  <dd>
                    {minuteLabel(candidate.startMinute)}–
                    {minuteLabel(candidate.endMinute)}
                  </dd>
                </div>
                <div>
                  <dt>Hizmet değeri</dt>
                  <dd>{formatCurrency(candidate.totalPriceKurus)}</dd>
                </div>
              </dl>
              <Button
                disabled={Boolean(submittingEntryId)}
                onClick={() => onOffer(candidate.entryId)}
              >
                {submittingEntryId === candidate.entryId
                  ? "Gönderiliyor…"
                  : "Teklif gönder"}
              </Button>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancelWaitlistDialog({
  entry,
  onOpenChange,
  onCancelled,
  onError,
}: {
  entry: AdminWaitlistEntry | null;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (entry) setReason("");
  }, [entry]);

  const valid = reason.trim().length >= 3;

  return (
    <AlertDialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {entry
              ? `${entry.fullName} için bekleme kaydı kapatılsın mı?`
              : "Bekleme kaydı kapatılsın mı?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Kapatma nedeni ekip geçmişinde saklanır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="service-field service-field--wide alert-dialog-field">
          <span>Kapatma nedeni</span>
          <Textarea
            name="waitlistCancellationReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder="Örn. Müşteri telefonla vazgeçtiğini bildirdi"
            autoFocus
          />
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!valid || submitting}
            onClick={() => {
              if (!entry || !valid) return;
              setSubmitting(true);
              void cancelAdminWaitlistEntry(entry.id, reason.trim())
                .then(() => onCancelled())
                .catch((cancelReason: unknown) =>
                  onError(
                    cancelReason instanceof Error
                      ? cancelReason.message
                      : "Kayıt kapatılamadı.",
                  ),
                )
                .finally(() => setSubmitting(false));
            }}
          >
            {submitting ? "Kapatılıyor…" : "Kaydı kapat"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function emptyStateCopy(status: string) {
  return (
    {
      ACTIVE: {
        title: "Aktif bekleme kaydı yok",
        body: "Uygun saat bulamayan doğrulanmış müşteriler burada görünür.",
      },
      OFFERED: {
        title: "Yanıt bekleyen teklif yok",
        body: "Ekip tarafından gönderilen teklifler müşteri yanıtlayana kadar burada görünür.",
      },
      FULFILLED: {
        title: "Randevuya dönüşen kayıt yok",
        body: "Müşterinin kabul ettiği ve kesinleşen randevular burada görünür.",
      },
      EXPIRED: {
        title: "Süresi dolan kayıt yok",
        body: "Geçerlilik aralığı sona eren bekleme kayıtları burada görünür.",
      },
      CANCELLED: {
        title: "İptal edilen kayıt yok",
        body: "Müşteri veya ekip tarafından kapatılan kayıtlar burada görünür.",
      },
    }[status] ?? {
      title: "Bu durumda kayıt yok",
      body: "Uygun saat bulamayan doğrulanmış müşteriler burada görünür.",
    }
  );
}

function offerStatusLabel(status: string) {
  return (
    {
      PENDING: "Müşteri yanıtı bekleniyor",
      ACCEPTED: "Kabul edildi",
      EXPIRED: "Süresi doldu",
      REVOKED: "Geri çekildi",
      FAILED: "Gönderilemedi",
    }[status] ?? status
  );
}

function minuteLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function formatDateKey(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00+03:00`));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    weekday: "short",
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value / 100);
}
