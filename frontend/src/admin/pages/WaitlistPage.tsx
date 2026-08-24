import { CalendarDotsIcon as CalendarClock } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import { ListPlusIcon as ListPlus } from "@phosphor-icons/react/dist/csr/ListPlus";
import { UserCheckIcon as UserRoundCheck } from "@phosphor-icons/react/dist/csr/UserCheck";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import type {
  AdminManagedProfessional,
  AdminWaitlistEntry,
} from "../admin.types";
import {
  cancelAdminWaitlistEntry,
  createAdminWaitlistOffer,
  getAdminProfessionals,
  getAdminWaitlist,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";

type Props = {
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
};

export function WaitlistPage({ branchId, onLogout, onNavigate }: Props) {
  const [status, setStatus] = useState("ACTIVE");
  const [items, setItems] = useState<AdminWaitlistEntry[]>([]);
  const [professionals, setProfessionals] = useState<
    AdminManagedProfessional[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offerEntry, setOfferEntry] = useState<AdminWaitlistEntry | null>(null);
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [entries, experts] = await Promise.all([
        getAdminWaitlist(branchId, status),
        getAdminProfessionals(branchId),
      ]);
      setItems(entries);
      setProfessionals(experts.filter((item) => item.isActive));
      setProfessionalId(
        (current) => current || experts.find((item) => item.isActive)?.id || "",
      );
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

  const createOffer = async () => {
    if (!offerEntry || !professionalId) return;
    setSubmitting(true);
    try {
      await createAdminWaitlistOffer(offerEntry.id, {
        professionalId,
        date,
        startTime: time,
      });
      toast.success("Müşteriye süreli saat teklifi oluşturuldu.");
      setOfferEntry(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Teklif oluşturulamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageFrame
      section="waitlist"
      eyebrow="Kapasite geri kazanımı"
      title="Bekleme listesi"
      description="Boşalan saatleri tercihlerle eşleşen müşterilere kontrollü biçimde teklif et."
      onLogout={onLogout}
      onNavigate={onNavigate}
      actions={
        <select
          className="admin-filter-select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Bekleme listesi durumu"
        >
          <option value="ACTIVE">Aktif</option>
          <option value="OFFERED">Teklif verilen</option>
          <option value="FULFILLED">Randevuya dönüşen</option>
          <option value="EXPIRED">Süresi dolan</option>
          <option value="CANCELLED">İptal edilen</option>
        </select>
      }
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
      {loading ? (
        <div className="operation-list">
          <div className="operation-card operation-card--skeleton" />
          <div className="operation-card operation-card--skeleton" />
        </div>
      ) : items.length ? (
        <div className="operation-list">
          {items.map((entry) => (
            <article className="operation-card waitlist-card" key={entry.id}>
              <header>
                <span className="operation-icon">
                  <ListPlus />
                </span>
                <span>
                  <small>{entry.phoneMasked}</small>
                  <h2>{entry.fullName}</h2>
                  <p>
                    {entry.services.map((service) => service.name).join(" · ")}
                  </p>
                </span>
                <b
                  className={`operation-status operation-status--${entry.status.toLowerCase()}`}
                >
                  {entry.status}
                </b>
              </header>
              <div className="waitlist-preferences">
                <span>
                  <CalendarClock />
                  <small>Tarih</small>
                  <strong>
                    {entry.dateFrom === entry.dateTo
                      ? formatDateKey(entry.dateFrom)
                      : `${formatDateKey(entry.dateFrom)} – ${formatDateKey(entry.dateTo)}`}
                  </strong>
                </span>
                <span>
                  <Clock3 />
                  <small>Saat aralığı</small>
                  <strong>
                    {minuteLabel(entry.startMinute)}–
                    {minuteLabel(entry.endMinute)}
                  </strong>
                </span>
                <span>
                  <UserRoundCheck />
                  <small>Uzman</small>
                  <strong>
                    {entry.professional?.name ?? "İlk müsait uzman"}
                  </strong>
                </span>
              </div>
              {entry.offers[0] && (
                <p className="operation-note">
                  <strong>Son teklif</strong>
                  {formatDateTime(entry.offers[0].startAt)} ·{" "}
                  {entry.offers[0].professional.name} · {entry.offers[0].status}
                </p>
              )}
              <footer>
                <span>
                  {entry.failedOfferCount
                    ? `${entry.failedOfferCount} süresi dolan teklif`
                    : "Henüz teklif yok"}
                </span>
                {["ACTIVE", "OFFERED"].includes(entry.status) && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void cancelAdminWaitlistEntry(
                          entry.id,
                          "Yönetici tarafından kapatıldı",
                        ).then(() => {
                          toast.success("Bekleme kaydı kapatıldı.");
                          void load();
                        })
                      }
                    >
                      <X /> Kaydı kapat
                    </Button>
                    {entry.status === "ACTIVE" && (
                      <Button onClick={() => setOfferEntry(entry)}>
                        <CalendarClock /> Manuel teklif
                      </Button>
                    )}
                  </div>
                )}
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <span>
            <ListPlus />
          </span>
          <strong>Bu durumda kayıt yok</strong>
          <p>Uygun saat bulamayan doğrulanmış müşteriler burada görünür.</p>
        </div>
      )}
      <Dialog
        open={Boolean(offerEntry)}
        onOpenChange={(open) => !open && setOfferEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Süreli saat teklifi</DialogTitle>
            <DialogDescription>
              Slot teklif süresince bloke edilir; müşteri kabul ederse randevu
              talebine dönüşür.
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-form-grid">
            <Label htmlFor="offer-professional">Uzman</Label>
            <select
              id="offer-professional"
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
            >
              {professionals.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Label htmlFor="offer-date">Tarih</Label>
            <input
              id="offer-date"
              type="date"
              min={today()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Label htmlFor="offer-time">Başlangıç</Label>
            <input
              id="offer-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferEntry(null)}>
              Vazgeç
            </Button>
            <Button
              disabled={submitting || !professionalId}
              onClick={() => void createOffer()}
            >
              {submitting ? "Oluşturuluyor…" : "Teklifi gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageFrame>
  );
}

function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
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
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
