import { useCallback, useEffect, useMemo, useState } from "react";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TagIcon } from "@phosphor-icons/react/dist/csr/Tag";
import { UserFocusIcon } from "@phosphor-icons/react/dist/csr/UserFocus";
import { toast } from "sonner";
import type { AdminCustomerDetail } from "../admin.types";
import type {
  CustomerCareProfile,
  CustomerMemory,
} from "../sprint12.types";
import {
  createCustomerServiceRecord,
  createCustomerTag,
  getCustomerMemory,
  getCustomerTags,
  setCustomerTags,
  updateCustomerCareProfile,
  searchAdminCustomers,
  previewCustomerMerge,
  mergeCustomer,
  reviseCustomerServiceRecord,
} from "../api/adminApi";
import type { AdminCustomerSearchItem } from "../admin.types";
import { formatMoney } from "../lib/adminFormat";
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

type Props = {
  customer: AdminCustomerDetail;
  onError: (message: string) => void;
};

const EMPTY_PROFILE: CustomerCareProfile = {
  preferredProfessionalId: null,
  preferredServiceId: null,
  stylePreferences: "",
  avoidProducts: "",
  customerReportedSensitivities: "",
  communicationNote: "",
};

export function CustomerMemoryPanel({ customer, onError }: Props) {
  const [memory, setMemory] = useState<CustomerMemory | null>(null);
  const [profile, setProfile] = useState<CustomerCareProfile>(EMPTY_PROFILE);
  const [allTags, setAllTags] = useState<
    Array<{ id: string; name: string; color: string }>
  >([]);
  const [tab, setTab] = useState<"profile" | "records" | "tags">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeResults, setMergeResults] = useState<AdminCustomerSearchItem[]>([]);
  const [mergeSource, setMergeSource] = useState<AdminCustomerSearchItem | null>(null);
  const [mergePreview, setMergePreview] = useState<unknown>(null);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [recordBookingId, setRecordBookingId] = useState("");
  const [record, setRecord] = useState({
    technique: "",
    formulaNote: "",
    productNote: "",
    resultNote: "",
    nextVisitRecommendation: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextMemory, tags] = await Promise.all([
        getCustomerMemory(customer.id),
        getCustomerTags(),
      ]);
      setMemory(nextMemory);
      setProfile(nextMemory.profile ?? EMPTY_PROFILE);
      setAllTags(tags);
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "Müşteri hafızası yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [customer.id, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const pastVisitBookings = useMemo(
    () =>
      customer.pastBookings.filter(
        (booking) =>
          booking.status === "CONFIRMED" &&
          booking.visitStatus !== "NO_SHOW" &&
          new Date(booking.endAt).getTime() <= Date.now(),
      ),
    [customer.pastBookings],
  );

  if (loading) {
    return <div className="customer-memory-skeleton" aria-label="Yükleniyor" />;
  }
  if (!memory) return null;

  const selectedBooking = pastVisitBookings.find(
    (booking) => booking.id === recordBookingId,
  );
  return (
    <section className="customer-memory">
      <header className="customer-memory__header">
        <span>
          <h3>Bakım ve ziyaret bilgileri</h3>
          <p>Müşterinin tercihlerini ve uygulama geçmişini burada tutun.</p>
        </span>
        <div className="customer-memory__metrics">
          <b>{memory.summary.pastVisitTotal} geçmiş ziyaret</b>
          <b>
            {formatMoney(memory.summary.estimatedServiceValueKurus)} tahmini
          </b>
        </div>
      </header>

      <div className="customer-memory__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="customer-memory-tab-profile"
          aria-controls="customer-memory-panel-profile"
          aria-selected={tab === "profile"}
          onClick={() => setTab("profile")}
        >
          <UserFocusIcon /> Bakım profili
        </button>
        <button
          type="button"
          role="tab"
          id="customer-memory-tab-records"
          aria-controls="customer-memory-panel-records"
          aria-selected={tab === "records"}
          onClick={() => setTab("records")}
        >
          <ClockCounterClockwiseIcon /> Hizmet kayıtları
        </button>
        <button
          type="button"
          role="tab"
          id="customer-memory-tab-tags"
          aria-controls="customer-memory-panel-tags"
          aria-selected={tab === "tags"}
          onClick={() => setTab("tags")}
        >
          <TagIcon /> Etiketler
        </button>
      </div>

      {tab === "profile" && (
        <div
          className="customer-memory__profile"
          role="tabpanel"
          id="customer-memory-panel-profile"
          aria-labelledby="customer-memory-tab-profile"
        >
          <label>
            <span>Stil tercihleri</span>
            <textarea
              id="customer-style-preferences"
              name="stylePreferences"
              value={profile.stylePreferences ?? ""}
              onChange={(event) =>
                setProfile({ ...profile, stylePreferences: event.target.value })
              }
              placeholder="Kesim, şekillendirme ve görünüm tercihleri"
            />
          </label>
          <label>
            <span>Kullanılmaması istenenler</span>
            <textarea
              id="customer-avoid-products"
              name="avoidProducts"
              value={profile.avoidProducts ?? ""}
              onChange={(event) =>
                setProfile({ ...profile, avoidProducts: event.target.value })
              }
              placeholder="Ürün veya uygulama notu"
            />
          </label>
          <label>
            <span>Müşterinin bildirdiği hassasiyetler</span>
            <textarea
              id="customer-reported-sensitivities"
              name="customerReportedSensitivities"
              value={profile.customerReportedSensitivities ?? ""}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  customerReportedSensitivities: event.target.value,
                })
              }
              placeholder="Yalnızca müşterinin kendi beyanını yazın"
            />
          </label>
          <label>
            <span>İletişim notu</span>
            <textarea
              id="customer-communication-note"
              name="communicationNote"
              value={profile.communicationNote ?? ""}
              onChange={(event) =>
                setProfile({ ...profile, communicationNote: event.target.value })
              }
              placeholder="Arama veya mesajlaşma tercihi"
            />
          </label>
          <Button
            type="button"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void updateCustomerCareProfile(customer.id, {
                preferredProfessionalId: profile.preferredProfessionalId,
                preferredServiceId: profile.preferredServiceId,
                stylePreferences: profile.stylePreferences ?? "",
                avoidProducts: profile.avoidProducts ?? "",
                customerReportedSensitivities:
                  profile.customerReportedSensitivities ?? "",
                communicationNote: profile.communicationNote ?? "",
              })
                .then((saved) => {
                  setProfile(saved);
                  toast.success("Bakım profili kaydedildi.");
                  void load();
                })
                .catch((reason: unknown) =>
                  onError(
                    reason instanceof Error
                      ? reason.message
                      : "Bakım profili kaydedilemedi.",
                  ),
                )
                .finally(() => setSaving(false));
            }}
          >
            <FloppyDiskIcon /> {saving ? "Kaydediliyor…" : "Profili kaydet"}
          </Button>
          <p className="customer-memory__storage-note">
            Fotoğraf ekleme, yalnız güvenli dosya depolaması hazır olduğunda
            açılacaktır.
          </p>
        </div>
      )}

      {tab === "records" && (
        <div
          className="customer-service-records"
          role="tabpanel"
          id="customer-memory-panel-records"
          aria-labelledby="customer-memory-tab-records"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedBooking) {
                onError("Hizmet kaydı için tamamlanan bir randevu seçin.");
                return;
              }
              setSaving(true);
              void createCustomerServiceRecord(customer.id, {
                bookingId: selectedBooking.id,
                serviceId: selectedBooking.items[0]?.serviceId,
                professionalId: selectedBooking.professional.id,
                ...record,
              })
                .then(() => {
                  toast.success("Hizmet kaydı oluşturuldu.");
                  setRecordBookingId("");
                  setRecord({
                    technique: "",
                    formulaNote: "",
                    productNote: "",
                    resultNote: "",
                    nextVisitRecommendation: "",
                  });
                  void load();
                })
                .catch((reason: unknown) =>
                  onError(
                    reason instanceof Error
                      ? reason.message
                      : "Hizmet kaydı oluşturulamadı.",
                  ),
                )
                .finally(() => setSaving(false));
            }}
          >
            <h4>Yeni hizmet kaydı</h4>
            <select
              name="bookingId"
              value={recordBookingId}
              onChange={(event) => setRecordBookingId(event.target.value)}
              required
            >
              <option value="">Geçmiş onaylı randevuyu seçin</option>
              {pastVisitBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {new Date(booking.startAt).toLocaleDateString("tr-TR")} ·{" "}
                  {booking.items.map((item) => item.serviceName).join(", ")}
                </option>
              ))}
            </select>
            {(
              [
                ["technique", "Uygulanan teknik"],
                ["formulaNote", "Saç / renk / formül notu"],
                ["productNote", "Kullanılan ürün notu"],
                ["resultNote", "Sonuç notu"],
                ["nextVisitRecommendation", "Sonraki ziyaret önerisi"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <textarea
                  name={key}
                  value={record[key]}
                  onChange={(event) =>
                    setRecord({ ...record, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <Button disabled={saving}>
              <PlusIcon /> Kaydı oluştur
            </Button>
          </form>
          <div className="customer-service-records__list">
            {!memory.serviceRecords.length && (
              <p className="admin-inline-empty">
                Henüz tamamlanmış hizmet kaydı yok.
              </p>
            )}
            {memory.serviceRecords.map((item) => (
              <article key={item.id}>
                <header>
                  <strong>{item.service?.name ?? "Hizmet kaydı"}</strong>
                  <small>
                    {new Date(item.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                    {item.professional?.name ?? "Uzman belirtilmedi"}
                  </small>
                </header>
                {item.technique && <p><b>Teknik:</b> {item.technique}</p>}
                {item.formulaNote && <p><b>Formül:</b> {item.formulaNote}</p>}
                {item.productNote && <p><b>Ürün:</b> {item.productNote}</p>}
                {item.resultNote && <p><b>Sonuç:</b> {item.resultNote}</p>}
                {item.nextVisitRecommendation && (
                  <p><b>Sonraki ziyaret:</b> {item.nextVisitRecommendation}</p>
                )}
                <details>
                  <summary>{item.revisions.length} revizyon · Yeni revizyon ekle</summary>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void reviseCustomerServiceRecord(item.id, {
                        technique: String(form.get("technique") ?? ""),
                        formulaNote: String(form.get("formulaNote") ?? ""),
                        productNote: String(form.get("productNote") ?? ""),
                        resultNote: String(form.get("resultNote") ?? ""),
                        nextVisitRecommendation: String(
                          form.get("nextVisitRecommendation") ?? "",
                        ),
                      })
                        .then(() => {
                          toast.success("Yeni hizmet kaydı revizyonu eklendi.");
                          return load();
                        })
                        .catch((reason: unknown) =>
                          onError(
                            reason instanceof Error
                              ? reason.message
                              : "Revizyon kaydedilemedi.",
                          ),
                        );
                    }}
                  >
                    <input name="technique" defaultValue={item.technique ?? ""} placeholder="Teknik" />
                    <input name="formulaNote" defaultValue={item.formulaNote ?? ""} placeholder="Formül notu" />
                    <input name="productNote" defaultValue={item.productNote ?? ""} placeholder="Ürün notu" />
                    <input name="resultNote" defaultValue={item.resultNote ?? ""} placeholder="Sonuç notu" />
                    <input name="nextVisitRecommendation" defaultValue={item.nextVisitRecommendation ?? ""} placeholder="Sonraki ziyaret" />
                    <Button variant="outline">Revizyonu kaydet</Button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "tags" && (
        <div
          className="customer-tags-manager"
          role="tabpanel"
          id="customer-memory-panel-tags"
          aria-labelledby="customer-memory-tab-tags"
        >
          <div className="customer-tags-manager__list">
            {allTags.map((tag) => {
              const selected = memory.tags.some((item) => item.id === tag.id);
              return (
                <label key={tag.id}>
                  <input
                    name={`tag-${tag.id}`}
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const ids = selected
                        ? memory.tags
                            .filter((item) => item.id !== tag.id)
                            .map((item) => item.id)
                        : [...memory.tags.map((item) => item.id), tag.id];
                      void setCustomerTags(customer.id, ids)
                        .then(() => void load())
                        .catch((reason: unknown) =>
                          onError(
                            reason instanceof Error
                              ? reason.message
                              : "Etiketler güncellenemedi.",
                          ),
                        );
                    }}
                  />
                  <i style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </label>
              );
            })}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (newTag.trim().length < 2) return;
              void createCustomerTag({ name: newTag.trim() })
                .then(() => {
                  setNewTag("");
                  void load();
                })
                .catch((reason: unknown) =>
                  onError(
                    reason instanceof Error
                      ? reason.message
                      : "Etiket oluşturulamadı.",
                  ),
                );
            }}
          >
            <input
              name="newTag"
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              placeholder="Yeni etiket"
            />
            <Button variant="outline">
              <PlusIcon /> Ekle
            </Button>
          </form>
          <details className="customer-merge-tool">
            <summary>
              <span>
                <strong>Yinelenen müşteriyi birleştir</strong>
                <small>Yalnız işletme sahibi</small>
              </span>
            </summary>
            <div className="customer-merge-tool__body">
              <p>
                Bu profil ana kayıt olarak kalır; seçtiğiniz müşterinin randevu
                ve ziyaret geçmişi buraya taşınır.
              </p>
              <label>
                <span>Birleştirilecek müşteri</span>
                <div>
                  <input
                    name="mergeCustomerSearch"
                    value={mergeQuery}
                    onChange={(event) => setMergeQuery(event.target.value)}
                    placeholder="Ad veya telefon"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void searchAdminCustomers(mergeQuery)
                        .then((result) =>
                          setMergeResults(
                            result.items.filter(
                              (item) => item.id !== customer.id,
                            ),
                          ),
                        )
                        .catch((reason: unknown) =>
                          onError(
                            reason instanceof Error
                              ? reason.message
                              : "Müşteri aranamadı.",
                          ),
                        )
                    }
                  >
                    Ara
                  </Button>
                </div>
              </label>
              {mergeResults.map((item) => (
                <button
                  type="button"
                  className="customer-merge-result"
                  key={item.id}
                  onClick={() => {
                    setMergeSource(item);
                    void previewCustomerMerge(customer.id, item.id)
                      .then(setMergePreview)
                      .catch((reason: unknown) =>
                        onError(
                          reason instanceof Error
                            ? reason.message
                            : "Birleştirme önizlenemedi.",
                        ),
                      );
                  }}
                >
                  <strong>{item.fullName}</strong>
                  <small>{item.phone}</small>
                </button>
              ))}
              {mergeSource && mergePreview !== null && (
                <div className="customer-merge-confirm">
                  <span>
                    <strong>{mergeSource.fullName}</strong>
                    <small>
                      Randevuları, ziyaret kayıtları ve salon notları bu profile
                      taşınacak.
                    </small>
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setMergeConfirmOpen(true)}
                  >
                    Birleştirmeyi incele
                  </Button>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
      <AlertDialog open={mergeConfirmOpen} onOpenChange={setMergeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Müşteri kayıtları birleştirilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {mergeSource?.fullName ?? "Seçilen müşteri"} kaydındaki randevu,
              ziyaret ve operasyon geçmişi {customer.fullName} profiline
              taşınacak. İşlem kayıt altına alınır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !mergeSource}
              onClick={(event) => {
                event.preventDefault();
                if (!mergeSource) return;
                setSaving(true);
                void mergeCustomer(customer.id, mergeSource.id)
                  .then(() => {
                    toast.success("Müşteri kayıtları birleştirildi.");
                    setMergeConfirmOpen(false);
                    setMergeSource(null);
                    setMergePreview(null);
                    setMergeResults([]);
                    return load();
                  })
                  .catch((reason: unknown) =>
                    onError(
                      reason instanceof Error
                        ? reason.message
                        : "Müşteri birleştirilemedi.",
                    ),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {saving ? "Birleştiriliyor…" : "Birleştir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
