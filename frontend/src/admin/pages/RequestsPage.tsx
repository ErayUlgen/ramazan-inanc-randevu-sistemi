import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CalendarDotsIcon as CalendarClock } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/csr/Check";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AdminChangeRequest } from "../admin.types";
import {
  decideAdminChangeRequest,
  getAdminChangeRequests,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";
import { Button } from "../../components/ui/button";
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
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

type Props = {
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
};

export function RequestsPage({ branchId, onLogout, onNavigate }: Props) {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<AdminChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<{
    item: AdminChangeRequest;
    kind: "APPROVE" | "REJECT";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getAdminChangeRequests(branchId, status));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Randevu değişiklikleri yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!decision) return;
    setSubmitting(true);
    try {
      await decideAdminChangeRequest(
        decision.item.id,
        decision.kind,
        reason.trim() || undefined,
      );
      toast.success(
        decision.kind === "APPROVE"
          ? "Yeni saat onaylandı."
          : "Değişiklik talebi reddedildi.",
      );
      setDecision(null);
      setReason("");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Talep sonuçlandırılamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageFrame
      section="requests"
      eyebrow="Karar kuyruğu"
      title="Randevu değişiklikleri"
      description="Müşterilerin tarih, saat veya uzman değişikliği isteklerini incele ve sonuçlandır."
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      {error && (
        <AdminErrorBanner
          title="Randevu değişiklikleri yenilenemedi"
          error={error}
          fallback="Değişiklik listesini şu an yenileyemedik. Birkaç saniye sonra yeniden deneyebilirsin."
          onRetry={() => void load()}
          retryLabel="Listeyi yenile"
        />
      )}
      <section className="service-workbench" aria-label="Randevu değişiklikleri">
        <div className="service-workbench__toolbar">
          <select
            className="admin-filter-select requests-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Talep durumu"
          >
            <option value="PENDING">Bekleyenler</option>
            <option value="APPROVED">Onaylananlar</option>
            <option value="REJECTED">Reddedilenler</option>
            <option value="EXPIRED">Süresi dolanlar</option>
          </select>
          <dl className="service-workbench__summary" aria-label="Talep özeti">
            <div>
              <dt>{statusLabel(status as AdminChangeRequest["status"])}</dt>
              <dd>{loading ? "–" : items.length}</dd>
            </div>
          </dl>
        </div>

        {loading ? (
          <div className="admin-skeleton admin-skeleton--cards" />
        ) : items.length ? (
          <div className="change-request-list">
            {items.map((item) => (
              <article className="change-request-card" key={item.id}>
                <header>
                  <span className="change-request-card__mark" aria-hidden="true">
                    <CalendarClock />
                  </span>
                  <span className="change-request-card__identity">
                    <small>{item.publicCode}</small>
                    <strong>{item.customer.fullName}</strong>
                    <span>{item.serviceNames.join(" · ")}</span>
                  </span>
                  <b
                    className={`change-request-card__status is-${item.status.toLowerCase()}`}
                  >
                    {statusLabel(item.status)}
                  </b>
                </header>
                <div className="change-comparison">
                  <TimeBlock
                    label="Mevcut randevu"
                    startAt={item.currentStartAt}
                    professional={item.currentProfessional.name}
                  />
                  <ArrowRight aria-hidden="true" />
                  <TimeBlock
                    label="İstenen saat"
                    startAt={item.requestedStartAt}
                    professional={item.requestedProfessional.name}
                    emphasized
                  />
                </div>
                {item.reason && (
                  <p className="change-request-card__note">
                    <strong>Müşteri notu</strong>
                    {item.reason}
                  </p>
                )}
                <footer>
                  <span>
                    <Clock3 /> {relativeTime(item.createdAt)}
                  </span>
                  {item.status === "PENDING" && (
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setDecision({ item, kind: "REJECT" })}
                      >
                        <X /> Reddet
                      </Button>
                      <Button
                        onClick={() => setDecision({ item, kind: "APPROVE" })}
                      >
                        <Check /> Onayla
                      </Button>
                    </div>
                  )}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="service-catalog-empty">
            <CalendarClock size={26} weight="duotone" aria-hidden="true" />
            <strong>{emptyStateCopy(status).title}</strong>
            <p>{emptyStateCopy(status).body}</p>
          </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision?.kind === "APPROVE"
                ? "Yeni saati onayla"
                : "Talebi reddet"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision?.kind === "APPROVE"
                ? "Randevu yeni saate taşınacak ve eski saat tekrar açılacak."
                : "Mevcut randevu değişmeden korunacak ve önerilen saat açılacak."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="dialog-form-field">
            <Label htmlFor="decision-reason">
              Karar notu <small>isteğe bağlı</small>
            </Label>
            <Textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {submitting
                ? "İşleniyor…"
                : decision?.kind === "APPROVE"
                  ? "Yeni saati onayla"
                  : "Talebi reddet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageFrame>
  );
}

function TimeBlock({
  label,
  startAt,
  professional,
  emphasized = false,
}: {
  label: string;
  startAt: string;
  professional: string;
  emphasized?: boolean;
}) {
  return (
    <section className={emphasized ? "is-emphasized" : ""}>
      <small>{label}</small>
      <strong>{formatDate(startAt)}</strong>
      <b>{formatTime(startAt)}</b>
      <span>{professional}</span>
    </section>
  );
}

function statusLabel(status: AdminChangeRequest["status"]) {
  return {
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    REJECTED: "Reddedildi",
    EXPIRED: "Süresi doldu",
    CANCELLED: "İptal edildi",
  }[status];
}
function emptyStateCopy(status: string) {
  return (
    {
      PENDING: {
        title: "Bekleyen talep yok",
        body: "Yeni bir değişiklik talebi geldiğinde burada karşılaştırmalı olarak görünecek.",
      },
      APPROVED: {
        title: "Onaylanan talep yok",
        body: "Onayladığınız değişiklik talepleri burada listelenecek.",
      },
      REJECTED: {
        title: "Reddedilen talep yok",
        body: "Reddettiğiniz değişiklik talepleri burada listelenecek.",
      },
      EXPIRED: {
        title: "Süresi dolan talep yok",
        body: "Yanıtsız kalıp süresi dolan talepler burada listelenecek.",
      },
    }[status] ?? {
      title: "Bu durumda talep yok",
      body: "Yeni bir talep geldiğinde burada karşılaştırmalı olarak görünecek.",
    }
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
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
function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000),
  );
  return minutes < 60
    ? `${minutes} dakika önce`
    : `${Math.floor(minutes / 60)} saat önce`;
}
