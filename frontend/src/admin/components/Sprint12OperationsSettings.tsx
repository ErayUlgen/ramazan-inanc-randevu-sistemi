import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { ClipboardTextIcon } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { toast } from "sonner";
import type { AdminManagedProfessional, AdminManagedService } from "../admin.types";
import type {
  AdminFormTemplate,
  AdminNotificationItem,
  AuditEvent,
  CalendarSubscription,
  FormField,
  NotificationRule,
} from "../sprint12.types";
import {
  adminExportUrl,
  archiveFormTemplate,
  createCalendarSubscription,
  createFormTemplate,
  getAdminNotificationCenter,
  getAdminProfessionals,
  getAdminServices,
  getAuditEvents,
  getCalendarSubscriptions,
  getFormTemplates,
  getNotificationRules,
  publishFormTemplate,
  retryAdminNotification,
  revokeCalendarSubscription,
  rotateCalendarSubscription,
  saveNotificationRule,
  setFormRequirements,
  updateFormDraft,
} from "../api/adminApi";

type Section = "forms" | "notifications" | "calendar" | "audit";

export function Sprint12OperationsSettings({
  branchId,
}: {
  branchId: string;
}) {
  const [section, setSection] = useState<Section>("forms");
  const [services, setServices] = useState<AdminManagedService[]>([]);
  const [professionals, setProfessionals] = useState<
    AdminManagedProfessional[]
  >([]);
  const [forms, setForms] = useState<AdminFormTemplate[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>(
    [],
  );
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>(
    [],
  );
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [secretUrl, setSecretUrl] = useState("");
  const [range, setRange] = useState(defaultRange);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextServices, nextProfessionals, nextForms, nextRules, nextNotifications, nextSubscriptions, nextAudit] =
        await Promise.all([
          getAdminServices(branchId),
          getAdminProfessionals(branchId),
          getFormTemplates(),
          getNotificationRules().catch(() => []),
          getAdminNotificationCenter().then((result) => result.items).catch(() => []),
          getCalendarSubscriptions().catch(() => []),
          getAuditEvents(range).then((result) => result.items).catch(() => []),
        ]);
      setServices(nextServices);
      setProfessionals(nextProfessionals);
      setForms(nextForms);
      setRules(nextRules);
      setNotifications(nextNotifications);
      setSubscriptions(nextSubscriptions);
      setAudit(nextAudit);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Operasyon ayarları yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, range]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="sprint12-settings">
      <header className="sprint12-settings__heading">
        <span>
          <small>Salon işletim sistemi</small>
          <h2>Operasyon temelleri</h2>
        </span>
        <button type="button" className="admin-quiet-button" onClick={() => void load()}>
          <ArrowClockwiseIcon /> Yenile
        </button>
      </header>
      <nav className="sprint12-settings__nav" aria-label="Operasyon ayarları">
        {(
          [
            ["forms", "Ön görüşme formları"],
            ["notifications", "Bildirimler"],
            ["calendar", "Takvim aboneliği"],
            ["audit", "İşlem günlüğü"],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-current={section === id ? "page" : undefined}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && <p className="sprint12-inline-error" role="alert">{error}</p>}
      {loading ? (
        <div className="sprint12-settings__loading" aria-label="Yükleniyor" />
      ) : (
        <>
          {section === "forms" && (
            <FormSettings
              forms={forms}
              services={services}
              reload={load}
              fail={setError}
            />
          )}
          {section === "notifications" && (
            <NotificationSettings
              rules={rules}
              notifications={notifications}
              reload={load}
              fail={setError}
            />
          )}
          {section === "calendar" && (
            <CalendarSettings
              subscriptions={subscriptions}
              professionals={professionals}
              secretUrl={secretUrl}
              setSecretUrl={setSecretUrl}
              reload={load}
              fail={setError}
            />
          )}
          {section === "audit" && (
            <AuditSettings events={audit} range={range} setRange={setRange} />
          )}
        </>
      )}
    </section>
  );
}

function FormSettings({
  forms,
  services,
  reload,
  fail,
}: {
  forms: AdminFormTemplate[];
  services: AdminManagedService[];
  reload: () => Promise<void>;
  fail: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const addField = () =>
    setFields([
      ...fields,
      {
        key: `alan_${fields.length + 1}`,
        label: "Yeni alan",
        type: "SHORT_TEXT",
        required: false,
      },
    ]);
  return (
    <div className="sprint12-split">
      <form
        className="sprint12-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!fields.length) {
            fail("Forma en az bir alan ekleyin.");
            return;
          }
          void createFormTemplate({ name, title, fields })
            .then(() => {
              setName("");
              setTitle("");
              setFields([]);
              toast.success("Form taslağı oluşturuldu.");
              return reload();
            })
            .catch((reason: unknown) =>
              fail(reason instanceof Error ? reason.message : "Form oluşturulamadı."),
            );
        }}
      >
        <header>
          <ClipboardTextIcon />
          <span><small>Yeni taslak</small><h3>Form oluştur</h3></span>
        </header>
        <label>
          <span>Yönetim adı</span>
          <input name="form-yonetim-adi" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
        </label>
        <label>
          <span>Müşteriye görünen başlık</span>
          <input name="form-musteri-basligi" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} />
        </label>
        <div className="form-field-builder">
          {fields.map((field, index) => (
            <div key={`${field.key}-${index}`}>
              <input
                aria-label="Alan etiketi"
                value={field.label}
                onChange={(event) => {
                  const next = [...fields];
                  next[index] = { ...field, label: event.target.value };
                  setFields(next);
                }}
              />
              <select
                value={field.type}
                onChange={(event) => {
                  const next = [...fields];
                  next[index] = {
                    ...field,
                    type: event.target.value as FormField["type"],
                  };
                  setFields(next);
                }}
              >
                <option value="SHORT_TEXT">Kısa metin</option>
                <option value="LONG_TEXT">Uzun metin</option>
                <option value="YES_NO">Evet / hayır</option>
                <option value="SINGLE_CHOICE">Tekli seçim</option>
                <option value="MULTI_CHOICE">Çoklu seçim</option>
                <option value="DATE">Tarih</option>
                <option value="INFORMATION">Bilgilendirme</option>
                <option value="CHECKBOX">Onay kutusu</option>
              </select>
              {(field.type === "SINGLE_CHOICE" ||
                field.type === "MULTI_CHOICE") && (
                <input
                  aria-label="Seçenekler"
                  placeholder="Seçenekleri virgülle ayırın"
                  value={(field.options ?? []).join(", ")}
                  onChange={(event) => {
                    const next = [...fields];
                    next[index] = {
                      ...field,
                      options: event.target.value
                        .split(",")
                        .map((option) => option.trim())
                        .filter(Boolean),
                    };
                    setFields(next);
                  }}
                />
              )}
              {field.type === "CHECKBOX" && (
                <select
                  aria-label="Onay türü"
                  value={field.consentType ?? "OPERATIONAL_CONSENT"}
                  onChange={(event) => {
                    const next = [...fields];
                    next[index] = {
                      ...field,
                      consentType: event.target
                        .value as NonNullable<FormField["consentType"]>,
                      documentKey: field.documentKey ?? field.key,
                      documentVersion: field.documentVersion ?? "1",
                    };
                    setFields(next);
                  }}
                >
                  <option value="NOTICE_VIEWED">Aydınlatma metni okundu</option>
                  <option value="OPERATIONAL_CONSENT">Operasyonel onay</option>
                  <option value="MARKETING_CONSENT">Pazarlama izni</option>
                </select>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={field.required ?? false}
                  onChange={(event) => {
                    const next = [...fields];
                    next[index] = { ...field, required: event.target.checked };
                    setFields(next);
                  }}
                />
                Zorunlu
              </label>
              <button type="button" onClick={() => setFields(fields.filter((_, itemIndex) => itemIndex !== index))}>
                Kaldır
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="admin-quiet-button" onClick={addField}>
          <PlusIcon /> Alan ekle
        </button>
        <button className="admin-primary-button">Taslağı kaydet</button>
      </form>
      <div className="sprint12-list">
        <header><h3>Form şablonları</h3><b>{forms.length}</b></header>
        {!forms.length && <p className="admin-inline-empty">Henüz form şablonu yok.</p>}
        {forms.map((form) => (
          <article key={form.id}>
            <span>
              <small>{form.status} · v{form.versions[0]?.version ?? 1}</small>
              <strong>{form.name}</strong>
              <p>{form.versions[0]?.definition.fields.length ?? 0} alan · {form.requirements.length} hizmet</p>
            </span>
            <div>
              {form.status !== "PUBLISHED" && (
                <button
                  type="button"
                  onClick={() =>
                    void publishFormTemplate(form.id)
                      .then(() => reload())
                      .catch((reason: unknown) => fail(reason instanceof Error ? reason.message : "Form yayınlanamadı."))
                  }
                >
                  Yayınla
                </button>
              )}
              {form.status === "PUBLISHED" && form.versions[0] && (
                <button
                  type="button"
                  onClick={() =>
                    void updateFormDraft(form.id, {
                      name: form.name,
                      description: form.description ?? undefined,
                      title: form.versions[0].title,
                      fields: form.versions[0].definition.fields,
                    })
                      .then(() => {
                        toast.success("Yeni taslak sürüm açıldı.");
                        return reload();
                      })
                      .catch((reason: unknown) =>
                        fail(
                          reason instanceof Error
                            ? reason.message
                            : "Taslak sürüm oluşturulamadı.",
                        ),
                      )
                  }
                >
                  Yeni taslak sürüm
                </button>
              )}
              {form.status !== "ARCHIVED" && (
                <button type="button" onClick={() => void archiveFormTemplate(form.id).then(() => reload())}>
                  Arşivle
                </button>
              )}
            </div>
            <details>
              <summary>Bağlı hizmetleri düzenle</summary>
              {services.map((service, index) => {
                const checked = form.requirements.some((item) => item.serviceId === service.id);
                return (
                  <label key={service.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const ids = checked
                          ? form.requirements.filter((item) => item.serviceId !== service.id).map((item) => item.serviceId)
                          : [...form.requirements.map((item) => item.serviceId), service.id];
                        void setFormRequirements(
                          form.id,
                          ids.map((serviceId, sortOrder) => ({
                            serviceId,
                            isRequired: true,
                            sortOrder,
                          })),
                        ).then(() => reload());
                      }}
                    />
                    {index + 1}. {service.name}
                  </label>
                );
              })}
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}

function NotificationSettings({
  rules,
  notifications,
  reload,
  fail,
}: {
  rules: NotificationRule[];
  notifications: AdminNotificationItem[];
  reload: () => Promise<void>;
  fail: (message: string) => void;
}) {
  const [status, setStatus] = useState("");
  const visible = status ? notifications.filter((item) => item.status === status) : notifications;
  return (
    <div className="sprint12-stack">
      <section className="sprint12-list">
        <header><h3>Bildirim kuralları</h3><b>{rules.length}</b></header>
        {rules.map((rule) => (
          <article key={rule.id}>
            <span>
              <small>{rule.channel} · {rule.isActive ? "Etkin" : "Kapalı"}</small>
              <strong>{eventLabel(rule.eventType)}</strong>
              <p>{rule.leadMinutes == null ? "Olay anında" : `${rule.leadMinutes} dakika önce`}</p>
            </span>
            <NotificationRuleEditor
              rule={rule}
              reload={reload}
              fail={fail}
            />
          </article>
        ))}
        <button
          type="button"
          className="admin-quiet-button"
          onClick={() =>
            void saveNotificationRule(null, {
              eventType: "BOOKING_REMINDER",
              channel: "SMS",
              leadMinutes: 1440,
              messageTemplate: null,
              bookingStatuses: ["CONFIRMED"],
              isActive: false,
              sortOrder: rules.length,
            }).then(() => reload())
          }
        >
          <PlusIcon /> 24 saatlik hatırlatma taslağı ekle
        </button>
      </section>
      <section className="sprint12-list">
        <header>
          <h3>Bildirim merkezi</h3>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tüm durumlar</option>
            <option value="PENDING">Bekleyen</option>
            <option value="SENT">Gönderildi</option>
            <option value="FAILED">Başarısız</option>
            <option value="RETRYING">Yeniden deneniyor</option>
            <option value="CANCELLED">İptal edildi</option>
          </select>
        </header>
        {!visible.length && <p className="admin-inline-empty">Bu durumda bildirim yok.</p>}
        {visible.slice(0, 50).map((item) => (
          <article key={item.id}>
            <span>
              <small>{item.status} · {new Date(item.scheduledFor).toLocaleString("tr-TR")}</small>
              <strong>{eventLabel(item.eventType)}</strong>
              <p>{item.booking ? `${item.booking.publicCode} · ${item.booking.customerNameSnapshot ?? "Müşteri"}` : "Sistem bildirimi"}</p>
              {item.lastErrorMessage && <p className="is-danger">{item.lastErrorMessage}</p>}
            </span>
            {item.canRetry && (
              <button type="button" onClick={() => void retryAdminNotification(item.id).then(() => reload())}>
                Yeniden dene
              </button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function NotificationRuleEditor({
  rule,
  reload,
  fail,
}: {
  rule: NotificationRule;
  reload: () => Promise<void>;
  fail: (message: string) => void;
}) {
  const [active, setActive] = useState(rule.isActive);
  const [leadMinutes, setLeadMinutes] = useState(
    rule.leadMinutes == null ? "" : String(rule.leadMinutes),
  );
  const [messageTemplate, setMessageTemplate] = useState(
    rule.messageTemplate ?? "",
  );
  return (
    <details className="notification-rule-editor">
      <summary>Düzenle</summary>
      <label className="sprint12-toggle">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Etkin
      </label>
      <label>
        <span>Kaç dakika önce</span>
        <input
          type="number"
          min={0}
          value={leadMinutes}
          placeholder="Olay anında"
          onChange={(event) => setLeadMinutes(event.target.value)}
        />
      </label>
      <label>
        <span>Mesaj şablonu</span>
        <textarea
          value={messageTemplate}
          placeholder="Boşsa sistemin güvenli varsayılan metni kullanılır"
          onChange={(event) => setMessageTemplate(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={() =>
          void saveNotificationRule(rule.id, {
            ...rule,
            isActive: active,
            leadMinutes: leadMinutes === "" ? null : Number(leadMinutes),
            messageTemplate: messageTemplate.trim() || null,
          })
            .then(() => reload())
            .catch((reason: unknown) =>
              fail(reason instanceof Error ? reason.message : "Kural güncellenemedi."),
            )
        }
      >
        Kuralı kaydet
      </button>
    </details>
  );
}

function CalendarSettings({
  subscriptions,
  professionals,
  secretUrl,
  setSecretUrl,
  reload,
  fail,
}: {
  subscriptions: CalendarSubscription[];
  professionals: AdminManagedProfessional[];
  secretUrl: string;
  setSecretUrl: (url: string) => void;
  reload: () => Promise<void>;
  fail: (message: string) => void;
}) {
  const [label, setLabel] = useState("Salon takvimi");
  const [professionalId, setProfessionalId] = useState("");
  return (
    <div className="sprint12-split">
      <form
        className="sprint12-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void createCalendarSubscription({
            label,
            scope: professionalId ? "PROFESSIONAL" : "BRANCH",
            ...(professionalId ? { professionalId } : {}),
          })
            .then((result) => {
              setSecretUrl(result.url);
              toast.success("Takvim aboneliği oluşturuldu.");
              return reload();
            })
            .catch((reason: unknown) => fail(reason instanceof Error ? reason.message : "Abonelik oluşturulamadı."));
        }}
      >
        <header><CalendarDotsIcon /><span><small>Tek yönlü ICS</small><h3>Yeni abonelik</h3></span></header>
        <label><span>Abonelik adı</span><input value={label} onChange={(event) => setLabel(event.target.value)} required /></label>
        <label>
          <span>Kapsam</span>
          <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
            <option value="">Bütün salon</option>
            {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
          </select>
        </label>
        <p>Bu URL bir parola gibidir. Yalnız güvendiğiniz takvim uygulamalarına ekleyin.</p>
        <button className="admin-primary-button">Güvenli URL oluştur</button>
        {secretUrl && (
          <div className="calendar-secret" role="status">
            <strong>URL yalnız şimdi gösterilir</strong>
            <input readOnly value={secretUrl} onFocus={(event) => event.currentTarget.select()} />
            <button type="button" onClick={() => void navigator.clipboard.writeText(secretUrl).then(() => toast.success("Takvim URL’si kopyalandı."))}>Kopyala</button>
          </div>
        )}
      </form>
      <div className="sprint12-list">
        <header><h3>Takvim abonelikleri</h3><b>{subscriptions.length}</b></header>
        {!subscriptions.length && <p className="admin-inline-empty">Henüz abonelik oluşturulmadı.</p>}
        {subscriptions.map((subscription) => (
          <article key={subscription.id}>
            <span>
              <small>{subscription.scope === "BRANCH" ? "Bütün salon" : subscription.professional?.name}</small>
              <strong>{subscription.label}</strong>
              <p>{subscription.revokedAt ? "İptal edildi" : subscription.lastUsedAt ? "Kullanılıyor" : "Henüz kullanılmadı"}</p>
            </span>
            <div>
              {!subscription.revokedAt && (
                <>
                  <button type="button" onClick={() => void rotateCalendarSubscription(subscription.id).then((result) => { setSecretUrl(result.url); return reload(); })}>Yenile</button>
                  <button type="button" onClick={() => void revokeCalendarSubscription(subscription.id).then(() => reload())}>İptal et</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AuditSettings({
  events,
  range,
  setRange,
}: {
  events: AuditEvent[];
  range: { from: string; to: string };
  setRange: (range: { from: string; to: string }) => void;
}) {
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const visible = events.filter(
    (event) =>
      (!action ||
        event.action.toLocaleLowerCase("tr-TR").includes(
          action.toLocaleLowerCase("tr-TR"),
        )) &&
      (!entityType || event.entityType === entityType),
  );
  const entityTypes = [...new Set(events.map((event) => event.entityType))];
  return (
    <div className="sprint12-stack">
      <section className="export-strip">
        <span><ShieldCheckIcon /><span><small>Yetkili dışa aktarma</small><strong>{range.from} – {range.to}</strong></span></span>
        <div>
          {(["bookings", "customers", "services", "professionals", "notifications"] as const).map((type) => (
            <a key={type} href={adminExportUrl(type, range.from, range.to)}>
              <DownloadSimpleIcon /> {exportLabel(type)}
            </a>
          ))}
        </div>
      </section>
      <section className="audit-filters" aria-label="İşlem günlüğü filtreleri">
        <label>
          <span>Başlangıç</span>
          <input
            type="date"
            value={range.from}
            onChange={(event) =>
              setRange({ ...range, from: event.target.value })
            }
          />
        </label>
        <label>
          <span>Bitiş</span>
          <input
            type="date"
            value={range.to}
            onChange={(event) =>
              setRange({ ...range, to: event.target.value })
            }
          />
        </label>
        <label>
          <span>İşlem</span>
          <input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="Örn. BOOKING"
          />
        </label>
        <label>
          <span>Kayıt türü</span>
          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            <option value="">Tümü</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </section>
      <section className="audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th>Zaman</th><th>İşlem</th><th>Kayıt</th><th>Yapan</th><th>Gerekçe</th></tr></thead>
          <tbody>
            {visible.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.createdAt).toLocaleString("tr-TR")}</td>
                <td><strong>{event.action}</strong></td>
                <td>{event.entityType}</td>
                <td>{event.adminUser?.displayName ?? event.actorLabel ?? event.actorType}</td>
                <td>{event.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p className="admin-inline-empty">Seçili filtrelerde işlem kaydı yok.</p>}
      </section>
    </div>
  );
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function eventLabel(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function exportLabel(type: string) {
  return {
    bookings: "Randevular",
    customers: "Müşteriler",
    services: "Hizmetler",
    professionals: "Uzmanlar",
    notifications: "Bildirimler",
  }[type] ?? type;
}
