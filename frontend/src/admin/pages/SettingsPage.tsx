import { BellRingingIcon as BellRing } from "@phosphor-icons/react/dist/csr/BellRinging";
import { LaptopIcon as Laptop } from "@phosphor-icons/react/dist/csr/Laptop";
import { FloppyDiskIcon as Save } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { DeviceMobileIcon as Smartphone } from "@phosphor-icons/react/dist/csr/DeviceMobile";
import { SpeakerHighIcon as Volume2 } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
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
  const [sessions, setSessions] = useState<AdminActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      setPolicy(await updateAdminBookingPolicy(branchId, input));
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
        <Button disabled={!policy || saving} onClick={() => void save()}>
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
            <div className="settings-form-grid">
              <NumberField
                label="İptal için minimum süre"
                suffix="dk"
                value={policy.cancellationLeadMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, cancellationLeadMinutes: value })
                }
              />
              <NumberField
                label="Değişiklik için minimum süre"
                suffix="dk"
                value={policy.rescheduleLeadMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, rescheduleLeadMinutes: value })
                }
              />
              <NumberField
                label="Değişiklik talebi geçerliliği"
                suffix="dk"
                value={policy.changeRequestTtlMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, changeRequestTtlMinutes: value })
                }
              />
              <NumberField
                label="Bekleme teklifi süresi"
                suffix="dk"
                value={policy.waitlistOfferTtlMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, waitlistOfferTtlMinutes: value })
                }
              />
              <NumberField
                label="Erken geliş"
                suffix="dk"
                value={policy.earlyArrivalMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, earlyArrivalMinutes: value })
                }
              />
              <NumberField
                label="Hatırlatma"
                suffix="dk"
                value={policy.reminderLeadMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, reminderLeadMinutes: value })
                }
              />
              <NumberField
                label="Değerlendirme isteği gecikmesi"
                suffix="dk"
                value={policy.reviewRequestDelayMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, reviewRequestDelayMinutes: value })
                }
              />
              <NumberField
                label="Değerlendirme linki süresi"
                suffix="gün"
                value={policy.reviewRequestExpiryDays}
                onChange={(value) =>
                  setPolicy({ ...policy, reviewRequestExpiryDays: value })
                }
              />
              <NumberField
                label="Bekleyen talep uyarısı"
                suffix="dk"
                value={policy.pendingWarningMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, pendingWarningMinutes: value })
                }
              />
              <NumberField
                label="Randevu penceresi"
                suffix="gün"
                value={policy.bookingWindowDays}
                onChange={(value) =>
                  setPolicy({ ...policy, bookingWindowDays: value })
                }
              />
              <NumberField
                label="Online saat aralığı (0 = hizmet süresi)"
                suffix="dk"
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
                value={policy.minimumBookingNoticeMinutes}
                onChange={(value) =>
                  setPolicy({ ...policy, minimumBookingNoticeMinutes: value })
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
              <NumberField
                label="OTP yeniden gönderme"
                suffix="sn"
                value={policy.otpResendSeconds}
                onChange={(value) =>
                  setPolicy({ ...policy, otpResendSeconds: value })
                }
              />
              <label className="settings-switch">
                <span>
                  <strong>Akıllı bekleme listesi</strong>
                  <small>Uygun müşteriye otomatik teklif oluştur.</small>
                </span>
                <Switch
                  checked={
                    policy.waitlistEnabled && policy.automaticWaitlistOffers
                  }
                  onCheckedChange={(checked) =>
                    setPolicy({
                      ...policy,
                      waitlistEnabled: checked,
                      automaticWaitlistOffers: checked,
                    })
                  }
                />
              </label>
              <label className="settings-switch">
                <span>
                  <strong>Ziyaret değerlendirmesi</strong>
                  <small>
                    Randevu bitişinden sonra tek kullanımlık değerlendirme
                    bağlantısı gönder.
                  </small>
                </span>
                <Switch
                  checked={policy.reviewRequestEnabled}
                  onCheckedChange={(checked) =>
                    setPolicy({ ...policy, reviewRequestEnabled: checked })
                  }
                />
              </label>
              <label className="settings-switch">
                <span>
                  <strong>Geç iptale izin ver</strong>
                  <small>Minimum süre geçse de müşteriye iptal göster.</small>
                </span>
                <Switch
                  checked={policy.allowLateCancellation}
                  onCheckedChange={(checked) =>
                    setPolicy({ ...policy, allowLateCancellation: checked })
                  }
                />
              </label>
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
            <div className="settings-fields">
              <label>
                Salon telefonu
                <input
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
              <label>
                WhatsApp
                <input
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
              <label>
                Yol tarifi bağlantısı
                <input
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
              <label>
                Google değerlendirme bağlantısı
                <input
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
              <label>
                Müşteri politika metni
                <textarea
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
              <label className="settings-switch">
                <span>
                  <strong>Sesli uyarı</strong>
                  <small>Yeni talepte kısa bir stüdyo tonu çalar.</small>
                </span>
                <Switch
                  checked={notificationPreferences.soundEnabled}
                  onCheckedChange={(checked) =>
                    updateNotificationPreference("soundEnabled", checked)
                  }
                />
              </label>
              <label className="settings-switch">
                <span>
                  <strong>Tarayıcı bildirimi</strong>
                  <small>Sekme arkadayken randevu bilgisini gösterir.</small>
                </span>
                <Switch
                  checked={notificationPreferences.desktopEnabled}
                  onCheckedChange={(checked) =>
                    updateNotificationPreference("desktopEnabled", checked)
                  }
                />
              </label>
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
                      onClick={() =>
                        void revokeAdminSession(session.id).then(() => {
                          toast.success("Oturum kapatıldı.");
                          void load();
                        })
                      }
                    >
                      <X />
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
          <Sprint12OperationsSettings branchId={branchId} />
        </>
      )}
    </AdminPageFrame>
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
  name,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  const generatedId = useId();
  const inputName = name ?? fieldName(label);
  const inputId = `${inputName}-${generatedId}`;
  return (
    <label htmlFor={inputId}>
      <span>{label}</span>
      <div>
        <input
          id={inputId}
          name={inputName}
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
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
