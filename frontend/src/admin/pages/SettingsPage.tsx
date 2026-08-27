import { BellRingingIcon as BellRing } from "@phosphor-icons/react/dist/csr/BellRinging";
import { LaptopIcon as Laptop } from "@phosphor-icons/react/dist/csr/Laptop";
import { FloppyDiskIcon as Save } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { DeviceMobileIcon as Smartphone } from "@phosphor-icons/react/dist/csr/DeviceMobile";
import { SpeakerHighIcon as Volume2 } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { WarningIcon as Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import type { AdminActiveSession, AdminBookingPolicy } from "../admin.types";
import {
  getAdminActiveSessions,
  getAdminBookingPolicy,
  revokeAdminSession,
  updateAdminBookingPolicy,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";
import {
  playAdminAlert,
  readAdminNotificationPreferences,
  saveAdminNotificationPreferences,
} from "../lib/adminNotifications";
import { Sprint12OperationsSettings } from "../components/Sprint12OperationsSettings";

type Props = {
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
};

export function SettingsPage({ branchId, onLogout, onNavigate }: Props) {
  const [policy, setPolicy] = useState<AdminBookingPolicy | null>(null);
  const [originalPolicy, setOriginalPolicy] =
    useState<AdminBookingPolicy | null>(null);
  const [sessions, setSessions] = useState<AdminActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<AdminActiveSession | null>(
    null,
  );
  const [notificationPreferences, setNotificationPreferences] = useState(
    readAdminNotificationPreferences,
  );
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextPolicy, nextSessions] = await Promise.all([
        getAdminBookingPolicy(branchId),
        getAdminActiveSessions(),
      ]);
      setPolicy(nextPolicy);
      setOriginalPolicy(nextPolicy);
      setSessions(nextSessions);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ayarlar yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId]);
  useEffect(() => {
    void load();
  }, [load]);

  const updateNotificationPreference = (
    field: "soundEnabled" | "desktopEnabled",
    checked: boolean,
  ) => {
    const next = { ...notificationPreferences, [field]: checked };
    setNotificationPreferences(next);
    saveAdminNotificationPreferences(next);
  };

  const dirty = Boolean(
    policy && originalPolicy && JSON.stringify(policy) !== JSON.stringify(originalPolicy),
  );

  const discard = () => {
    if (originalPolicy) setPolicy(originalPolicy);
  };

  const save = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      const {
        id: _id,
        branchId: _branchId,
        updatedAt: _updatedAt,
        ...input
      } = policy;
      void _id;
      void _branchId;
      void _updatedAt;
      const saved = await updateAdminBookingPolicy(branchId, input);
      setPolicy(saved);
      setOriginalPolicy(saved);
      toast.success("Randevu politikaları güncellendi.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ayarlar kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageFrame
      section="settings"
      eyebrow="Salon yapılandırması"
      title="Ayarlar ve güvenlik"
      description="Müşteri politikalarını, iletişim kanallarını ve yönetici oturumlarını tek yerde yönet."
      onLogout={onLogout}
      onNavigate={onNavigate}
      actions={
        <Button disabled={!policy || saving || !dirty} onClick={() => void save()}>
          <Save />
          {saving ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
        </Button>
      }
    >
      {error && (
        <AdminErrorBanner
          title="Ayarlar kaydedilemedi"
          error={error}
          fallback="Değişikliklerini şu an kaydedemedik. Bilgileri kontrol edip yeniden deneyebilirsin."
          onRetry={() => void load()}
          retryLabel="Ayarları yenile"
        />
      )}
      {loading || !policy ? (
        <div className="settings-grid">
          <div className="settings-card operation-card--skeleton" />
          <div className="settings-card operation-card--skeleton" />
        </div>
      ) : (
        <>
          {dirty && (
            <div className="settings-dirty-banner" role="status">
              <span>
                <strong>Kaydedilmemiş değişiklikler var</strong>
                <small>
                  "Değişiklikleri kaydet" yalnızca randevu politikalarını ve
                  salon bağlantılarını kaydeder — masaüstü bildirimleri ayrı
                  ayrı kaydedilir.
                </small>
              </span>
              <button type="button" className="admin-quiet-button" onClick={discard}>
                Vazgeç
              </button>
            </div>
          )}
          <div className="settings-grid">
            <section className="settings-card settings-card--wide">
              <header>
                <span className="operation-icon">
                  <BellRing />
                </span>
                <span>
                  <small>Müşteri deneyimi</small>
                  <h2>Randevu politikaları</h2>
                </span>
              </header>
              <div className="settings-policy-groups">
                <PolicyGroup title="İptal ve değişiklik">
                  <NumberField
                    label="İptal için minimum süre"
                    suffix="dk"
                    min={0}
                    max={10080}
                    value={policy.cancellationLeadMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, cancellationLeadMinutes: value })
                    }
                  />
                  <NumberField
                    label="Değişiklik için minimum süre"
                    suffix="dk"
                    min={0}
                    max={10080}
                    value={policy.rescheduleLeadMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, rescheduleLeadMinutes: value })
                    }
                  />
                  <NumberField
                    label="Değişiklik talebi geçerliliği"
                    suffix="dk"
                    min={15}
                    max={10080}
                    value={policy.changeRequestTtlMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, changeRequestTtlMinutes: value })
                    }
                  />
                  <NumberField
                    label="Eş zamanlı değişiklik talebi"
                    suffix="adet"
                    min={1}
                    max={3}
                    value={policy.maxActiveChangeRequests}
                    onChange={(value) =>
                      setPolicy({ ...policy, maxActiveChangeRequests: value })
                    }
                  />
                  <ToggleField
                    title="Geç iptale izin ver"
                    description="Minimum süre geçse de müşteriye iptal göster."
                    checked={policy.allowLateCancellation}
                    onCheckedChange={(checked) =>
                      setPolicy({ ...policy, allowLateCancellation: checked })
                    }
                  />
                </PolicyGroup>

                <PolicyGroup title="Bekleme listesi">
                  <NumberField
                    label="Bekleme teklifi süresi"
                    suffix="dk"
                    min={5}
                    max={1440}
                    value={policy.waitlistOfferTtlMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, waitlistOfferTtlMinutes: value })
                    }
                  />
                  <ToggleField
                    title="Bekleme listesi açık"
                    description="Dolu günlerde müşterinin tercih bırakmasına izin ver."
                    checked={policy.waitlistEnabled}
                    onCheckedChange={(checked) =>
                      setPolicy({
                        ...policy,
                        waitlistEnabled: checked,
                        automaticWaitlistOffers: false,
                      })
                    }
                  />
                  <div className="settings-policy-method" role="note">
                    <span>Teklif yöntemi</span>
                    <strong>Yönetici kontrollü</strong>
                    <p>
                      Boşalan saat önce ekibin ekranına düşer. SMS yalnız ekip
                      uygun müşteriyi seçip teklif gönderdiğinde gider.
                    </p>
                  </div>
                </PolicyGroup>

                <PolicyGroup title="Hatırlatma ve değerlendirme">
                  <NumberField
                    label="Hatırlatma"
                    suffix="dk"
                    min={5}
                    max={1440}
                    value={policy.reminderLeadMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, reminderLeadMinutes: value })
                    }
                  />
                  <NumberField
                    label="Değerlendirme isteği gecikmesi"
                    suffix="dk"
                    min={0}
                    max={10080}
                    value={policy.reviewRequestDelayMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, reviewRequestDelayMinutes: value })
                    }
                  />
                  <NumberField
                    label="Değerlendirme linki süresi"
                    suffix="gün"
                    min={1}
                    max={90}
                    value={policy.reviewRequestExpiryDays}
                    onChange={(value) =>
                      setPolicy({ ...policy, reviewRequestExpiryDays: value })
                    }
                  />
                  <ToggleField
                    title="Ziyaret değerlendirmesi"
                    description="Randevu bitişinden sonra tek kullanımlık değerlendirme bağlantısı gönder."
                    checked={policy.reviewRequestEnabled}
                    onCheckedChange={(checked) =>
                      setPolicy({ ...policy, reviewRequestEnabled: checked })
                    }
                  />
                </PolicyGroup>

                <PolicyGroup title="Randevu penceresi ve kapasite">
                  <NumberField
                    label="Randevu penceresi"
                    suffix="gün"
                    min={1}
                    max={90}
                    value={policy.bookingWindowDays}
                    onChange={(value) =>
                      setPolicy({ ...policy, bookingWindowDays: value })
                    }
                  />
                  <NumberField
                    label="Online saat aralığı (0 = hizmet süresi)"
                    suffix="dk"
                    min={0}
                    max={240}
                    value={policy.publicSlotGranularityMinutes}
                    onChange={(value) =>
                      setPolicy({
                        ...policy,
                        publicSlotGranularityMinutes: value,
                      })
                    }
                  />
                  <NumberField
                    label="En erken rezervasyon"
                    suffix="dk önce"
                    min={0}
                    max={10080}
                    value={policy.minimumBookingNoticeMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, minimumBookingNoticeMinutes: value })
                    }
                  />
                  <NumberField
                    label="Erken geliş"
                    suffix="dk"
                    min={0}
                    max={60}
                    value={policy.earlyArrivalMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, earlyArrivalMinutes: value })
                    }
                  />
                  <NumberField
                    label="Bekleyen talep uyarısı"
                    suffix="dk"
                    min={5}
                    max={1440}
                    value={policy.pendingWarningMinutes}
                    onChange={(value) =>
                      setPolicy({ ...policy, pendingWarningMinutes: value })
                    }
                  />
                  <label className="settings-cutoff-field">
                    <span>Aynı gün online kapanış</span>
                    <div>
                      <input
                        name="ayni-gun-online-kapanis"
                        type="time"
                        disabled={policy.sameDayBookingCutoffMinute === null}
                        value={
                          policy.sameDayBookingCutoffMinute === null
                            ? "18:00"
                            : minuteLabel(policy.sameDayBookingCutoffMinute)
                        }
                        onChange={(event) =>
                          setPolicy({
                            ...policy,
                            sameDayBookingCutoffMinute: timeMinute(
                              event.target.value,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPolicy({
                            ...policy,
                            sameDayBookingCutoffMinute:
                              policy.sameDayBookingCutoffMinute === null
                                ? 1080
                                : null,
                          })
                        }
                      >
                        {policy.sameDayBookingCutoffMinute === null
                          ? "Aç"
                          : "Kapat"}
                      </button>
                    </div>
                  </label>
                </PolicyGroup>

                <PolicyGroup title="Güvenlik (OTP)">
                  <NumberField
                    label="OTP yeniden gönderme"
                    suffix="sn"
                    min={30}
                    max={600}
                    value={policy.otpResendSeconds}
                    onChange={(value) =>
                      setPolicy({ ...policy, otpResendSeconds: value })
                    }
                  />
                  <NumberField
                    label="Maksimum OTP denemesi"
                    suffix="deneme"
                    min={3}
                    max={10}
                    value={policy.otpMaxAttempts}
                    onChange={(value) =>
                      setPolicy({ ...policy, otpMaxAttempts: value })
                    }
                  />
                </PolicyGroup>
              </div>
            </section>
            <section className="settings-card">
              <header>
                <span className="operation-icon">
                  <Smartphone />
                </span>
                <span>
                  <small>İletişim</small>
                  <h2>Salon bağlantıları</h2>
                </span>
              </header>
              <div className="settings-contact-fields">
                <label className="service-field">
                  <span>Salon telefonu</span>
                  <Input
                    name="salon-telefonu"
                    type="tel"
                    autoComplete="tel"
                    value={policy.salonPhone ?? ""}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        salonPhone: event.target.value || null,
                      })
                    }
                    placeholder="+90 258…"
                  />
                </label>
                <label className="service-field">
                  <span>WhatsApp</span>
                  <Input
                    name="whatsapp-telefonu"
                    type="tel"
                    autoComplete="tel"
                    value={policy.whatsappPhone ?? ""}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        whatsappPhone: event.target.value || null,
                      })
                    }
                    placeholder="+90 5…"
                  />
                </label>
                <label className="service-field">
                  <span>Yol tarifi bağlantısı</span>
                  <Input
                    name="yol-tarifi-baglantisi"
                    type="url"
                    inputMode="url"
                    value={policy.mapsUrl ?? ""}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        mapsUrl: event.target.value || null,
                      })
                    }
                    placeholder="https://maps.google.com/…"
                  />
                </label>
                <label className="service-field">
                  <span>Google değerlendirme bağlantısı</span>
                  <Input
                    name="google-degerlendirme-baglantisi"
                    type="url"
                    inputMode="url"
                    value={policy.googleReviewUrl ?? ""}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        googleReviewUrl: event.target.value || null,
                      })
                    }
                    placeholder="https://g.page/r/…"
                  />
                </label>
                <label className="service-field service-field--wide">
                  <span>Müşteri politika metni</span>
                  <Textarea
                    name="musteri-politika-metni"
                    value={policy.customerPolicyText ?? ""}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        customerPolicyText: event.target.value || null,
                      })
                    }
                    maxLength={1000}
                  />
                </label>
              </div>
            </section>
            <section className="settings-card">
              <header>
                <span className="operation-icon">
                  <Volume2 />
                </span>
                <span>
                  <small>Yönetici uyarıları</small>
                  <h2>Masaüstü bildirimleri</h2>
                </span>
              </header>
              <div className="settings-fields">
                <ToggleField
                  title="Sesli uyarı"
                  description="Yeni talepte kısa bir stüdyo tonu çalar."
                  checked={notificationPreferences.soundEnabled}
                  onCheckedChange={(checked) =>
                    updateNotificationPreference("soundEnabled", checked)
                  }
                />
                <ToggleField
                  title="Tarayıcı bildirimi"
                  description="Sekme arkadayken randevu bilgisini gösterir."
                  checked={notificationPreferences.desktopEnabled}
                  onCheckedChange={(checked) =>
                    updateNotificationPreference("desktopEnabled", checked)
                  }
                />
                <p className="notification-permission-state">
                  İzin durumu:{" "}
                  <strong>
                    {notificationPermissionLabel(notificationPermission)}
                  </strong>
                </p>
                <div className="notification-setting-actions">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      void playAdminAlert().catch(() =>
                        setError("Tarayıcı sesi başlatamadı."),
                      )
                    }
                  >
                    Test sesi
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={
                      typeof Notification === "undefined" ||
                      notificationPermission === "granted"
                    }
                    onClick={() => {
                      if (typeof Notification === "undefined") return;
                      void Notification.requestPermission().then((permission) => {
                        setNotificationPermission(permission);
                        if (permission === "granted")
                          updateNotificationPreference("desktopEnabled", true);
                      });
                    }}
                  >
                    Bildirim izni ver
                  </Button>
                </div>
              </div>
            </section>
            <section className="settings-card">
              <header>
                <span className="operation-icon">
                  <ShieldCheck />
                </span>
                <span>
                  <small>Güvenlik</small>
                  <h2>Aktif oturumlar</h2>
                </span>
              </header>
              <div className="session-list">
                {sessions.map((session) => (
                  <article key={session.id}>
                    <span>
                      {session.current ? <Laptop /> : <Smartphone />}
                      <span>
                        <strong>
                          {session.current ? "Bu cihaz" : "Yönetici oturumu"}
                        </strong>
                        <small>
                          Son etkinlik {formatDateTime(session.lastSeenAt)}
                        </small>
                      </span>
                    </span>
                    {session.current ? (
                      <b>Şu an</b>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Oturumu kapat"
                        onClick={() => setRevokeTarget(session)}
                      >
                        <X />
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
          <div className="settings-advanced-heading">
            <span>Gelişmiş</span>
            <p>
              Ön görüşme formları, bildirim kuralları, takvim aboneliği ve
              işlem günlüğü — nadiren değiştirilen operasyonel ayarlar.
            </p>
          </div>
          <Sprint12OperationsSettings branchId={branchId} />
        </>
      )}

      <AlertDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Warning size={22} weight="duotone" />
            </AlertDialogMedia>
            <AlertDialogTitle>Oturum kapatılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu cihazdaki yönetici oturumu hemen sonlanır; erişim için
              yeniden giriş yapılması gerekir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!revokeTarget) return;
                const target = revokeTarget;
                void revokeAdminSession(target.id)
                  .then(() => {
                    toast.success("Oturum kapatıldı.");
                    void load();
                  })
                  .catch((reason: unknown) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Oturum kapatılamadı.",
                    ),
                  )
                  .finally(() => setRevokeTarget(null));
              }}
            >
              Oturumu kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageFrame>
  );
}

function PolicyGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-policy-group">
      <p className="settings-policy-group__title">{title}</p>
      <div className="settings-policy-fields">{children}</div>
    </div>
  );
}

function ToggleField({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-switch">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

/**
 * Etiket metninden kararlı bir alan adı üretir. Türkçe karakterler ASCII
 * karşılıklarına indirgenir, böylece `name` değeri tarayıcı ve parola
 * yöneticileri için öngörülebilir kalır.
 */
function fieldName(label: string) {
  const map: Record<string, string> = {
    ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g",
    ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c",
  };
  return label
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (character) => map[character] ?? character)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
  min = 0,
  max,
  name,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  name?: string;
}) {
  const generatedId = useId();
  const inputName = name ?? fieldName(label);
  const inputId = `${inputName}-${generatedId}`;
  return (
    <label className="service-field" htmlFor={inputId}>
      <span>{label}</span>
      <div className="settings-number-field">
        <Input
          id={inputId}
          name={inputName}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(
              Math.min(max ?? Infinity, Math.max(min, Number(event.target.value) || 0)),
            )
          }
        />
        <b>{suffix}</b>
      </div>
    </label>
  );
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
function minuteLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
function timeMinute(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
function notificationPermissionLabel(
  value: NotificationPermission | "unsupported",
) {
  if (value === "granted") return "İzin verildi";
  if (value === "denied") return "Tarayıcıda engellendi";
  if (value === "unsupported") return "Bu tarayıcı desteklemiyor";
  return "Henüz sorulmadı";
}
