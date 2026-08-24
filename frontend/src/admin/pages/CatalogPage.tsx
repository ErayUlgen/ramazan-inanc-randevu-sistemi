import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { ScissorsIcon } from "@phosphor-icons/react/dist/csr/Scissors";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import {
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProfessionalAvatar } from "../../components/ui/ProfessionalAvatar";
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
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import type {
  AdminManagedProfessional,
  AdminManagedService,
  AdminProfessionalServiceSetting,
} from "../admin.types";
import {
  getAdminProfessionals,
  getAdminServices,
  getProfessionalServiceSettings,
  saveAdminProfessional,
  saveAdminService,
  updateProfessionalServiceSetting,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";
import { formatMoney } from "../lib/adminFormat";

type Props = {
  mode: "services" | "professionals";
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
};

export function CatalogPage({ mode, branchId, onLogout, onNavigate }: Props) {
  const [services, setServices] = useState<AdminManagedService[]>([]);
  const [professionals, setProfessionals] = useState<
    AdminManagedProfessional[]
  >([]);
  const [editingService, setEditingService] = useState<
    AdminManagedService | "new" | null
  >(null);
  const [editingProfessional, setEditingProfessional] = useState<
    AdminManagedProfessional | "new" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lastServiceTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openServiceEditor = (
    service: AdminManagedService | "new",
    trigger: HTMLButtonElement,
  ) => {
    lastServiceTriggerRef.current = trigger;
    setEditingService(service);
  };

  const closeServiceEditor = () => {
    setEditingService(null);
    window.requestAnimationFrame(() => lastServiceTriggerRef.current?.focus());
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextServices, nextProfessionals] = await Promise.all([
        getAdminServices(branchId),
        getAdminProfessionals(branchId),
      ]);
      setServices(nextServices);
      setProfessionals(nextProfessionals);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Katalog yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <AdminPageFrame
      section={mode}
      eyebrow="Rezervasyon kataloğu"
      title={mode === "services" ? "Hizmetler" : "Uzmanlar"}
      description={
        mode === "services"
          ? "Süre, fiyat ve online görünürlüğü yönetin. Eski randevuların snapshot değerleri değişmez."
          : "Uzmanların rezervasyon durumunu ve sunduğu hizmetleri yönetin; vardiya veya puantaj oluşturmayın."
      }
      onLogout={onLogout}
      onNavigate={onNavigate}
      actions={
        <button
          type="button"
          className="admin-primary-button"
          onClick={(event) => {
            if (mode === "services") {
              openServiceEditor("new", event.currentTarget);
            } else {
              setEditingProfessional("new");
            }
          }}
        >
          <PlusIcon size={19} weight="bold" />
          {mode === "services" ? "Hizmet ekle" : "Uzman ekle"}
        </button>
      }
    >
      {loading && (
        <div className="catalog-admin-grid">
          <div className="admin-skeleton admin-skeleton--cards" />
          <div className="admin-skeleton admin-skeleton--cards" />
        </div>
      )}
      {!loading && mode === "services" && (
        <ServicesWorkbench
          services={services}
          professionals={professionals}
          onEdit={openServiceEditor}
        />
      )}
      {!loading && mode === "professionals" && (
        <section className="catalog-admin-grid catalog-admin-grid--professionals">
          {professionals.map((professional) => (
            <button
              type="button"
              className={`catalog-admin-card catalog-admin-card--professional${professional.isActive ? "" : " is-inactive"}`}
              key={professional.id}
              onClick={() => setEditingProfessional(professional)}
            >
              <ProfessionalAvatar
                name={professional.name}
                src={professional.photoUrl ?? undefined}
              />
              <span className="catalog-admin-card__copy">
                <small>
                  {String(professional.sortOrder + 1).padStart(2, "0")}
                </small>
                <strong>{professional.name}</strong>
                <em>{professional.title}</em>
              </span>
              <span className="catalog-admin-card__states">
                <b className={professional.isActive ? "is-positive" : ""}>
                  {professional.isActive ? "Aktif" : "Pasif"}
                </b>
                <b className={professional.isOnlineBookable ? "is-online" : ""}>
                  {professional.isOnlineBookable
                    ? "Online açık"
                    : "Online kapalı"}
                </b>
              </span>
              <small>{professional.serviceIds.length} hizmet</small>
            </button>
          ))}
        </section>
      )}
      {!loading && mode === "professionals" && !professionals.length && (
        <div className="admin-empty-state">
          <UserIcon size={27} />
          <strong>Henüz kayıt yok</strong>
          <p>İlk kaydı ekleyerek rezervasyon kataloğunu oluşturun.</p>
        </div>
      )}
      {error && (
        <AdminErrorBanner
          title="Katalog yenilenemedi"
          error={error}
          fallback="Hizmet ve uzman bilgilerini şu an yükleyemedik. Birkaç saniye sonra yeniden deneyebilirsin."
          onRetry={() => void load()}
          retryLabel="Kataloğu yenile"
        />
      )}
      {notice && (
        <div className="admin-toast" role="status">
          {notice}
        </div>
      )}

      {editingService && (
        <ServiceEditor
          value={editingService === "new" ? null : editingService}
          branchId={branchId}
          professionals={professionals}
          onClose={closeServiceEditor}
          onSaved={() => {
            setEditingService(null);
            setNotice("Hizmet kataloğu güncellendi.");
            void load();
            window.requestAnimationFrame(() => lastServiceTriggerRef.current?.focus());
          }}
        />
      )}
      {editingProfessional && (
        <ProfessionalEditor
          value={editingProfessional === "new" ? null : editingProfessional}
          branchId={branchId}
          services={services}
          onClose={() => setEditingProfessional(null)}
          onSaved={() => {
            setEditingProfessional(null);
            setNotice("Uzman ayarları güncellendi.");
            void load();
          }}
        />
      )}
    </AdminPageFrame>
  );
}

const CANONICAL_SERVICE_CATEGORIES = [
  "Erkek Hizmetleri",
  "Kadın Hizmetleri",
] as const;

function ServicesWorkbench({
  services,
  professionals,
  onEdit,
}: {
  services: AdminManagedService[];
  professionals: AdminManagedProfessional[];
  onEdit: (
    service: AdminManagedService | "new",
    trigger: HTMLButtonElement,
  ) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("tr-TR");
  const professionalById = useMemo(
    () => new Map(professionals.map((professional) => [professional.id, professional])),
    [professionals],
  );
  const visibleServices = useMemo(
    () =>
      services.filter((service) => {
        if (!normalizedQuery) return true;
        const professionalNames = service.professionalIds
          .map((id) => professionalById.get(id)?.name ?? "")
          .join(" ");
        return `${service.name} ${service.category} ${service.description} ${professionalNames}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      }),
    [normalizedQuery, professionalById, services],
  );
  const categories = useMemo(() => {
    const extras = services
      .map((service) => service.category)
      .filter(
        (category, index, all) =>
          !CANONICAL_SERVICE_CATEGORIES.includes(
            category as (typeof CANONICAL_SERVICE_CATEGORIES)[number],
          ) && all.indexOf(category) === index,
      );
    return [...CANONICAL_SERVICE_CATEGORIES, ...extras];
  }, [services]);
  const activeCount = services.filter((service) => service.isActive).length;
  const onlineCount = services.filter(
    (service) => service.isActive && service.isOnlineBookable,
  ).length;

  return (
    <section className="service-workbench" aria-label="Hizmet kataloğu">
      <div className="service-workbench__toolbar">
        <label className="service-search" htmlFor="service-catalog-search">
          <MagnifyingGlassIcon size={20} aria-hidden="true" />
          <span className="sr-only">Hizmet ara</span>
          <input
            id="service-catalog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hizmet veya uzman ara"
            autoComplete="off"
          />
        </label>
        <dl className="service-workbench__summary" aria-label="Katalog özeti">
          <div>
            <dt>Hizmet</dt>
            <dd>{services.length}</dd>
          </div>
          <div>
            <dt>Aktif</dt>
            <dd>{activeCount}</dd>
          </div>
          <div>
            <dt>Online</dt>
            <dd>{onlineCount}</dd>
          </div>
        </dl>
      </div>

      {!services.length ? (
        <div className="service-catalog-empty">
          <ScissorsIcon size={28} weight="duotone" aria-hidden="true" />
          <strong>Hizmet kataloğu boş</strong>
          <p>Rezervasyon akışını başlatmak için ilk hizmeti ekleyin.</p>
          <button
            type="button"
            onClick={(event) => onEdit("new", event.currentTarget)}
          >
            <PlusIcon size={18} weight="bold" />
            Hizmet ekle
          </button>
        </div>
      ) : visibleServices.length === 0 ? (
        <div className="service-catalog-empty service-catalog-empty--search">
          <MagnifyingGlassIcon size={28} aria-hidden="true" />
          <strong>Aramayla eşleşen hizmet yok</strong>
          <p>Farklı bir hizmet veya uzman adı deneyin.</p>
          <button type="button" onClick={() => setQuery("")}>
            Aramayı temizle
          </button>
        </div>
      ) : (
        <div className="service-catalog-groups">
          {categories.map((category) => {
            const categoryServices = visibleServices
              .filter((service) => service.category === category)
              .sort((left, right) => left.sortOrder - right.sortOrder);
            if (!categoryServices.length) return null;
            return (
              <section className="admin-service-category" key={category}>
                <header className="admin-service-category__header">
                  <div>
                    <strong>{category}</strong>
                    <span>{categoryServices.length} hizmet</span>
                  </div>
                  <span aria-hidden="true">Süre · fiyat · ekip</span>
                </header>
                <div className="admin-service-category__rows">
                  {categoryServices.map((service) => {
                    const assignedProfessionals = service.professionalIds
                      .map((id) => professionalById.get(id))
                      .filter(
                        (professional): professional is AdminManagedProfessional =>
                          Boolean(professional),
                      );
                    return (
                      <button
                        type="button"
                        className={`service-catalog-row${
                          service.isActive ? "" : " is-inactive"
                        }`}
                        key={service.id}
                        onClick={(event) => onEdit(service, event.currentTarget)}
                        aria-label={`${service.name} hizmetini düzenle`}
                      >
                        <span className="service-catalog-row__mark" aria-hidden="true">
                          <ScissorsIcon size={20} weight="duotone" />
                        </span>
                        <span className="service-catalog-row__identity">
                          <strong>{service.name}</strong>
                          <small>{service.description}</small>
                        </span>
                        <span className="service-catalog-row__facts">
                          <span>
                            <ClockIcon size={16} aria-hidden="true" />
                            {service.durationMinutes} dk
                          </span>
                          <strong>{formatMoney(service.priceKurus)}</strong>
                        </span>
                        <span className="service-catalog-row__team">
                          <span className="service-avatar-stack" aria-hidden="true">
                            {assignedProfessionals.slice(0, 3).map((professional) => (
                              <ProfessionalAvatar
                                key={professional.id}
                                name={professional.name}
                                src={professional.photoUrl ?? undefined}
                              />
                            ))}
                          </span>
                          <span>
                            <strong>{assignedProfessionals.length} uzman</strong>
                            <small>
                              {assignedProfessionals.length
                                ? assignedProfessionals
                                    .slice(0, 2)
                                    .map((professional) => professional.name.split(" ")[0])
                                    .join(", ")
                                : "Eşleşme yok"}
                            </small>
                          </span>
                        </span>
                        <span className="service-catalog-row__status">
                          <b className={service.isActive ? "is-active" : ""}>
                            {service.isActive ? "Aktif" : "Pasif"}
                          </b>
                          <b className={service.isOnlineBookable ? "is-online" : ""}>
                            {service.isOnlineBookable ? "Online" : "Telefon"}
                          </b>
                        </span>
                        <CaretRightIcon
                          className="service-catalog-row__arrow"
                          size={18}
                          weight="bold"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ServiceEditor({
  value,
  branchId,
  professionals,
  onClose,
  onSaved,
}: {
  value: AdminManagedService | null;
  branchId: string;
  professionals: AdminManagedProfessional[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(value?.name ?? "");
  const [category, setCategory] = useState(
    value?.category ?? "Erkek Hizmetleri",
  );
  const [description, setDescription] = useState(value?.description ?? "");
  const [preVisitInstructions, setPreVisitInstructions] = useState(
    value?.preVisitInstructions ?? "",
  );
  const [postVisitInstructions, setPostVisitInstructions] = useState(
    value?.postVisitInstructions ?? "",
  );
  const [duration, setDuration] = useState(value?.durationMinutes ?? 60);
  const [price, setPrice] = useState((value?.priceKurus ?? 0) / 100);
  const [isActive, setIsActive] = useState(value?.isActive ?? true);
  const [isOnline, setIsOnline] = useState(value?.isOnlineBookable ?? true);
  const [sortOrder, setSortOrder] = useState(value?.sortOrder ?? 0);
  const [professionalIds, setProfessionalIds] = useState(
    value?.professionalIds ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const dirty = value
    ? name !== value.name ||
      category !== value.category ||
      description !== value.description ||
      preVisitInstructions !== (value.preVisitInstructions ?? "") ||
      postVisitInstructions !== (value.postVisitInstructions ?? "") ||
      Number(duration) !== value.durationMinutes ||
      Math.round(Number(price) * 100) !== value.priceKurus ||
      isActive !== value.isActive ||
      (isActive && isOnline) !== value.isOnlineBookable ||
      sortOrder !== value.sortOrder ||
      [...professionalIds].sort().join("|") !==
        [...value.professionalIds].sort().join("|")
    : Boolean(
        name.trim() ||
        description.trim() ||
        preVisitInstructions.trim() ||
        postVisitInstructions.trim() ||
        Number(price) ||
        professionalIds.length ||
        category !== "Erkek Hizmetleri" ||
        Number(duration) !== 60 ||
        !isActive ||
        !isOnline ||
        sortOrder,
      );
  const valid =
    name.trim().length >= 2 &&
    category.trim().length >= 2 &&
    description.trim().length >= 2 &&
    Number(duration) >= 5 &&
    Number(duration) % 5 === 0 &&
    Number(price) >= 0;
  const requestClose = () => {
    if (!dirty) onClose();
    else setDiscardDialogOpen(true);
  };

  const toggleProfessional = (professionalId: string, checked: boolean) => {
    setProfessionalIds((current) =>
      checked
        ? current.includes(professionalId)
          ? current
          : [...current, professionalId]
        : current.filter((id) => id !== professionalId),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await saveAdminService(value?.id ?? null, {
        branchId,
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        preVisitInstructions: preVisitInstructions.trim() || null,
        postVisitInstructions: postVisitInstructions.trim() || null,
        durationMinutes: Number(duration),
        priceKurus: Math.round(Number(price) * 100),
        isActive,
        isOnlineBookable: isActive && isOnline,
        sortOrder,
        professionalIds,
      });
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Hizmet kaydedilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && requestClose()}>
        <SheetContent
          side="right"
          className="service-editor-sheet"
          showCloseButton
          onEscapeKeyDown={(event) => {
            if (dirty) {
              event.preventDefault();
              setDiscardDialogOpen(true);
            }
          }}
        >
          <form className="service-editor-form" onSubmit={submit}>
            <SheetHeader className="service-editor-header">
              <span className="service-editor-header__icon" aria-hidden="true">
                <ScissorsIcon size={22} weight="duotone" />
              </span>
              <span>
                <SheetTitle>{value ? "Hizmeti düzenle" : "Yeni hizmet"}</SheetTitle>
                <SheetDescription>
                  Süre, fiyat ve uzman eşleşmesini tek yerden yönetin.
                </SheetDescription>
              </span>
            </SheetHeader>

            <div className="service-editor-scroll">
              <section className="service-editor-section" aria-labelledby="service-basics-title">
                <header>
                  <strong id="service-basics-title">Temel bilgiler</strong>
                  <span>Müşterinin katalogda göreceği bilgiler</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field service-field--wide">
                    <span>Hizmet adı</span>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      maxLength={100}
                      autoFocus
                    />
                  </label>
                  <label className="service-field">
                    <span>Kategori</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      required
                    >
                      {CANONICAL_SERVICE_CATEGORIES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="service-field">
                    <span>Liste sırası</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={sortOrder}
                      onChange={(event) => setSortOrder(Number(event.target.value))}
                    />
                  </label>
                  <label className="service-field service-field--wide">
                    <span>Kısa açıklama</span>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      required
                      maxLength={500}
                      placeholder="Hizmeti tek cümlede anlatın"
                    />
                  </label>
                </div>
              </section>

              <section className="service-editor-section" aria-labelledby="service-booking-title">
                <header>
                  <strong id="service-booking-title">Rezervasyon akışı</strong>
                  <span>Takvim hesaplamasında kullanılacak değerler</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field">
                    <span>Süre</span>
                    <span className="service-field__unit">
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={duration}
                        onChange={(event) => setDuration(Number(event.target.value))}
                      />
                      <b>dk</b>
                    </span>
                  </label>
                  <label className="service-field">
                    <span>Fiyat</span>
                    <span className="service-field__unit">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={price}
                        onChange={(event) => setPrice(Number(event.target.value))}
                      />
                      <b>₺</b>
                    </span>
                  </label>
                  <label className="service-field service-field--wide">
                    <span>
                      Randevu öncesi bilgi <small>İsteğe bağlı</small>
                    </span>
                    <Textarea
                      value={preVisitInstructions}
                      onChange={(event) => setPreVisitInstructions(event.target.value)}
                      maxLength={1000}
                      placeholder="Müşterinin randevu öncesinde bilmesi gereken kısa bilgi"
                    />
                  </label>
                  <label className="service-field service-field--wide">
                    <span>
                      İşlem sonrası bilgi <small>İsteğe bağlı</small>
                    </span>
                    <Textarea
                      value={postVisitInstructions}
                      onChange={(event) => setPostVisitInstructions(event.target.value)}
                      maxLength={1000}
                      placeholder="İşlem sonrasında uygulanacak kısa bakım bilgisi"
                    />
                  </label>
                </div>
              </section>

              <section className="service-editor-section" aria-labelledby="service-team-title">
                <header className="service-editor-section__team-header">
                  <span>
                    <strong id="service-team-title">Uzman eşleşmesi</strong>
                    <span>Bu hizmet için randevu alınabilecek ekip</span>
                  </span>
                  <b>{professionalIds.length}/{professionals.length} seçili</b>
                </header>
                <div className="service-professional-list">
                  {professionals.map((professional) => {
                    const checked = professionalIds.includes(professional.id);
                    return (
                      <label
                        className={`service-professional-option${checked ? " is-selected" : ""}`}
                        key={professional.id}
                      >
                        <ProfessionalAvatar
                          name={professional.name}
                          src={professional.photoUrl ?? undefined}
                        />
                        <span>
                          <strong>{professional.name}</strong>
                          <small>{professional.title}</small>
                        </span>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            toggleProfessional(professional.id, nextChecked === true)
                          }
                          aria-label={`${professional.name} uzmanını ${
                            checked ? "hizmetten çıkar" : "hizmete ekle"
                          }`}
                        />
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="service-editor-section" aria-labelledby="service-publish-title">
                <header>
                  <strong id="service-publish-title">Yayın durumu</strong>
                  <span>Salon ve müşteri ekranındaki kullanılabilirlik</span>
                </header>
                <div className="service-publish-options">
                  <label>
                    <span>
                      <strong>Aktif hizmet</strong>
                      <small>Salon ekibi yeni randevularda kullanabilir.</small>
                    </span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </label>
                  <label className={!isActive ? "is-disabled" : ""}>
                    <span>
                      <strong>Online rezervasyon</strong>
                      <small>Müşteri rezervasyon ekranında görünür.</small>
                    </span>
                    <Switch
                      checked={isOnline && isActive}
                      disabled={!isActive}
                      onCheckedChange={setIsOnline}
                    />
                  </label>
                </div>
              </section>

              {error && (
                <p className="service-editor-error" role="alert">
                  <WarningIcon size={18} weight="fill" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <footer className="service-editor-footer">
              <span aria-live="polite">
                {!dirty
                  ? "Değişiklik yok"
                  : valid
                    ? "Kaydedilmeyi bekleyen değişiklikler var"
                    : "Zorunlu alanları tamamlayın"}
              </span>
              <div>
                <button
                  type="button"
                  className="service-editor-action service-editor-action--quiet"
                  onClick={requestClose}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="service-editor-action service-editor-action--primary"
                  disabled={submitting || !dirty || !valid}
                >
                  <FloppyDiskIcon size={18} weight="bold" />
                  {submitting ? "Kaydediliyor…" : "Hizmeti kaydet"}
                </button>
              </div>
            </footer>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent className="service-discard-dialog">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <WarningIcon size={22} weight="duotone" />
            </AlertDialogMedia>
            <AlertDialogTitle>Değişiklikler kaybolacak</AlertDialogTitle>
            <AlertDialogDescription>
              Bu hizmette yaptığınız düzenlemeler henüz kaydedilmedi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Düzenlemeye dön</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              Kaydetmeden kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProfessionalServiceSettings({
  professionalId,
}: {
  professionalId: string;
}) {
  const [items, setItems] = useState<AdminProfessionalServiceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getProfessionalServiceSettings(professionalId);
      setItems(response.services);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Uzman hizmet ayarları yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const change = (
    serviceId: string,
    patch: Partial<AdminProfessionalServiceSetting>,
  ) =>
    setItems((current) =>
      current.map((item) =>
        item.serviceId === serviceId ? { ...item, ...patch } : item,
      ),
    );

  const save = async (item: AdminProfessionalServiceSetting) => {
    setSavingId(item.serviceId);
    setError("");
    try {
      const response = await updateProfessionalServiceSetting(
        professionalId,
        item.serviceId,
        {
          isAssigned: item.isAssigned,
          durationMinutesOverride: item.durationMinutesOverride,
          priceKurusOverride: item.priceKurusOverride,
          isOnlineBookableOverride: item.isOnlineBookableOverride,
          bufferBeforeMinutes: item.bufferBeforeMinutes,
          bufferAfterMinutes: item.bufferAfterMinutes,
          processingStartOffsetMinutes: item.processingStartOffsetMinutes,
          processingDurationMinutes: item.processingDurationMinutes,
        },
      );
      setItems(response.services);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Hizmet ayarı kaydedilemedi.",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="professional-service-settings">
      <header>
        <span>
          <small>Uzman bazlı çalışma</small>
          <strong>Hizmet süreleri ve kapasite</strong>
        </span>
        <p>
          Boş alan salon varsayılanını kullanır. Tamponlar müşterinin randevu
          süresini değiştirmez.
        </p>
      </header>
      {loading ? (
        <div className="operation-card--skeleton professional-service-settings__skeleton" />
      ) : (
        <div className="professional-service-settings__list">
          {items.map((item) => (
            <article
              key={item.serviceId}
              className={item.isAssigned ? "" : "is-disabled"}
            >
              <header>
                <span>
                  <strong>{item.serviceName}</strong>
                  <small>
                    Salon varsayılanı: {item.salonDurationMinutes} dk /{" "}
                    {formatMoney(item.salonPriceKurus)}
                  </small>
                </span>
                <label>
                  <input
                    type="checkbox"
                    checked={item.isAssigned}
                    onChange={(event) =>
                      change(item.serviceId, {
                        isAssigned: event.target.checked,
                      })
                    }
                  />{" "}
                  Sunuyor
                </label>
              </header>
              <div>
                <label>
                  Özel süre
                  <input
                    disabled={!item.isAssigned}
                    type="number"
                    min={5}
                    step={5}
                    placeholder={`${item.salonDurationMinutes} dk`}
                    value={item.durationMinutesOverride ?? ""}
                    onChange={(event) =>
                      change(item.serviceId, {
                        durationMinutesOverride: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label>
                  Özel fiyat (₺)
                  <input
                    disabled={!item.isAssigned}
                    type="number"
                    min={0}
                    step={1}
                    placeholder={`${item.salonPriceKurus / 100}`}
                    value={
                      item.priceKurusOverride === null
                        ? ""
                        : item.priceKurusOverride / 100
                    }
                    onChange={(event) =>
                      change(item.serviceId, {
                        priceKurusOverride: event.target.value
                          ? Math.round(Number(event.target.value) * 100)
                          : null,
                      })
                    }
                  />
                </label>
                <label>
                  Online rezervasyon
                  <select
                    disabled={!item.isAssigned}
                    value={
                      item.isOnlineBookableOverride === null
                        ? "inherit"
                        : item.isOnlineBookableOverride
                          ? "yes"
                          : "no"
                    }
                    onChange={(event) =>
                      change(item.serviceId, {
                        isOnlineBookableOverride:
                          event.target.value === "inherit"
                            ? null
                            : event.target.value === "yes",
                      })
                    }
                  >
                    <option value="inherit">Salon ayarını kullan</option>
                    <option value="yes">Online açık</option>
                    <option value="no">Yalnız telefon</option>
                  </select>
                </label>
                <label>
                  Ön tampon
                  <input
                    disabled={!item.isAssigned}
                    type="number"
                    min={0}
                    step={5}
                    value={item.bufferBeforeMinutes}
                    onChange={(event) =>
                      change(item.serviceId, {
                        bufferBeforeMinutes: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Son tampon
                  <input
                    disabled={!item.isAssigned}
                    type="number"
                    min={0}
                    step={5}
                    value={item.bufferAfterMinutes}
                    onChange={(event) =>
                      change(item.serviceId, {
                        bufferAfterMinutes: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Serbest bekleme başlangıcı
                  <input
                    disabled={!item.isAssigned}
                    type="number"
                    min={0}
                    step={5}
                    placeholder="Yok"
                    value={item.processingStartOffsetMinutes ?? ""}
                    onChange={(event) =>
                      change(item.serviceId, {
                        processingStartOffsetMinutes: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label>
                  Serbest bekleme süresi
                  <input
                    disabled={
                      !item.isAssigned ||
                      item.processingStartOffsetMinutes === null
                    }
                    type="number"
                    min={0}
                    step={5}
                    value={item.processingDurationMinutes}
                    onChange={(event) =>
                      change(item.serviceId, {
                        processingDurationMinutes: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <footer>
                <small>
                  Etkin değer: {item.effectiveDurationMinutes} dk /{" "}
                  {formatMoney(item.effectivePriceKurus)}
                </small>
                <button
                  type="button"
                  className="admin-quiet-button"
                  disabled={savingId === item.serviceId}
                  onClick={() => void save(item)}
                >
                  {savingId === item.serviceId
                    ? "Kaydediliyor…"
                    : "Hizmet ayarını kaydet"}
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ProfessionalEditor({
  value,
  branchId,
  services,
  onClose,
  onSaved,
}: {
  value: AdminManagedProfessional | null;
  branchId: string;
  services: AdminManagedService[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(value?.name ?? "");
  const [title, setTitle] = useState(
    value?.title ?? "Anatomik Saç Kesim Uzmanı",
  );
  const [bio, setBio] = useState(value?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(value?.photoUrl ?? "");
  const [isActive, setIsActive] = useState(value?.isActive ?? true);
  const [isOnline, setIsOnline] = useState(value?.isOnlineBookable ?? true);
  const [sortOrder, setSortOrder] = useState(value?.sortOrder ?? 0);
  const [serviceIds, setServiceIds] = useState(value?.serviceIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = value
    ? name !== value.name ||
      title !== value.title ||
      bio !== (value.bio ?? "") ||
      photoUrl !== (value.photoUrl ?? "") ||
      isActive !== value.isActive ||
      (isActive && isOnline) !== value.isOnlineBookable ||
      sortOrder !== value.sortOrder ||
      [...serviceIds].sort().join("|") !==
        [...value.serviceIds].sort().join("|")
    : Boolean(
        name.trim() ||
        bio.trim() ||
        photoUrl.trim() ||
        serviceIds.length ||
        title !== "Anatomik Saç Kesim Uzmanı" ||
        !isActive ||
        !isOnline ||
        sortOrder,
      );
  const valid =
    name.trim().length >= 2 &&
    title.trim().length >= 2 &&
    serviceIds.length > 0;
  const requestClose = () => {
    if (
      !dirty ||
      window.confirm("Kaydedilmemiş değişiklikleri kapatmak istiyor musunuz?")
    ) {
      onClose();
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await saveAdminProfessional(value?.id ?? null, {
        branchId,
        name: name.trim(),
        title: title.trim(),
        bio: bio.trim() || null,
        photoUrl: photoUrl.trim() || null,
        isActive,
        isOnlineBookable: isActive && isOnline,
        sortOrder,
        serviceIds,
      });
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Uzman kaydedilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-action-layer catalog-editor-layer">
      <button
        className="admin-action-backdrop"
        type="button"
        onClick={requestClose}
        aria-label="Uzman formunu kapat"
      />
      <form
        className="catalog-editor"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
      >
        <header>
          <span>
            <small>Uzman kataloğu</small>
            <strong>{value ? "Uzmanı düzenle" : "Yeni uzman"}</strong>
          </span>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Uzman formunu kapat"
          >
            <XIcon size={21} />
          </button>
        </header>
        <div className="catalog-editor__scroll">
          <div className="catalog-editor__body admin-form-grid">
          <label>
            <span>Ad soyad</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label>
            <span>Unvan</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label>
            <span>Liste sırası</span>
            <input
              type="number"
              min={0}
              step={1}
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </label>
          <label className="is-full">
            <span>Kısa açıklama</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
            />
          </label>
          <label className="is-full">
            <span>
              Gerçek fotoğraf URL’si <small>isteğe bağlı</small>
            </span>
            <input
              type="url"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <fieldset className="is-full checklist-field">
            <legend>Sunduğu hizmetler</legend>
            {services
              .filter((service) => service.isActive)
              .map((service) => (
                <label key={service.id}>
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(service.id)}
                    onChange={() =>
                      setServiceIds((current) =>
                        current.includes(service.id)
                          ? current.filter((id) => id !== service.id)
                          : [...current, service.id],
                      )
                    }
                  />
                  <span>{service.name}</span>
                </label>
              ))}
          </fieldset>
          <label className="admin-switch-row">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>
              <strong>Aktif uzman</strong>
              <small>Salon randevularında seçilebilir.</small>
            </span>
          </label>
          <label className="admin-switch-row">
            <input
              type="checkbox"
              checked={isOnline && isActive}
              disabled={!isActive}
              onChange={(event) => setIsOnline(event.target.checked)}
            />
            <span>
              <strong>Online rezervasyon</strong>
              <small>Müşteri ekranında görünür.</small>
            </span>
          </label>
          </div>
          {value && <ProfessionalServiceSettings professionalId={value.id} />}
          {error && (
            <p className="admin-form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer>
          <button
            type="button"
            className="admin-quiet-button"
            onClick={requestClose}
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="admin-primary-button"
            disabled={submitting || !dirty || !valid}
          >
            {submitting ? "Kaydediliyor…" : "Uzmanı kaydet"}
          </button>
        </footer>
      </form>
    </div>
  );
}
