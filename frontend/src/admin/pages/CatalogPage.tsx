import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { ScissorsIcon } from "@phosphor-icons/react/dist/csr/Scissors";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
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
  const lastProfessionalTriggerRef = useRef<HTMLButtonElement | null>(null);

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

  const openProfessionalEditor = (
    professional: AdminManagedProfessional | "new",
    trigger: HTMLButtonElement,
  ) => {
    lastProfessionalTriggerRef.current = trigger;
    setEditingProfessional(professional);
  };

  const closeProfessionalEditor = () => {
    setEditingProfessional(null);
    window.requestAnimationFrame(() =>
      lastProfessionalTriggerRef.current?.focus(),
    );
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
              openProfessionalEditor("new", event.currentTarget);
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
        <ProfessionalsWorkbench
          professionals={professionals}
          onEdit={openProfessionalEditor}
        />
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
          onClose={closeProfessionalEditor}
          onSaved={() => {
            setEditingProfessional(null);
            setNotice("Uzman ayarları güncellendi.");
            void load();
            window.requestAnimationFrame(() =>
              lastProfessionalTriggerRef.current?.focus(),
            );
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

function ProfessionalsWorkbench({
  professionals,
  onEdit,
}: {
  professionals: AdminManagedProfessional[];
  onEdit: (
    professional: AdminManagedProfessional | "new",
    trigger: HTMLButtonElement,
  ) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("tr-TR");
  const visibleProfessionals = useMemo(
    () =>
      professionals
        .filter((professional) => {
          if (!normalizedQuery) return true;
          return `${professional.name} ${professional.title} ${professional.bio ?? ""}`
            .toLocaleLowerCase("tr-TR")
            .includes(normalizedQuery);
        })
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [normalizedQuery, professionals],
  );
  const activeCount = professionals.filter(
    (professional) => professional.isActive,
  ).length;
  const onlineCount = professionals.filter(
    (professional) => professional.isActive && professional.isOnlineBookable,
  ).length;

  return (
    <section className="service-workbench" aria-label="Uzman kataloğu">
      <div className="service-workbench__toolbar">
        <label
          className="service-search"
          htmlFor="professional-catalog-search"
        >
          <MagnifyingGlassIcon size={20} aria-hidden="true" />
          <span className="sr-only">Uzman ara</span>
          <input
            id="professional-catalog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Uzman adı veya unvan ara"
            autoComplete="off"
          />
        </label>
        <dl className="service-workbench__summary" aria-label="Ekip özeti">
          <div>
            <dt>Uzman</dt>
            <dd>{professionals.length}</dd>
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

      {!professionals.length ? (
        <div className="service-catalog-empty">
          <UserIcon size={28} weight="duotone" aria-hidden="true" />
          <strong>Ekip kaydı yok</strong>
          <p>Rezervasyon alabilmek için ilk uzmanı ekleyin.</p>
          <button
            type="button"
            onClick={(event) => onEdit("new", event.currentTarget)}
          >
            <PlusIcon size={18} weight="bold" />
            Uzman ekle
          </button>
        </div>
      ) : visibleProfessionals.length === 0 ? (
        <div className="service-catalog-empty service-catalog-empty--search">
          <MagnifyingGlassIcon size={28} aria-hidden="true" />
          <strong>Aramayla eşleşen uzman yok</strong>
          <p>Farklı bir ad veya unvan deneyin.</p>
          <button type="button" onClick={() => setQuery("")}>
            Aramayı temizle
          </button>
        </div>
      ) : (
        <div className="service-catalog-groups">
          <div className="admin-service-category__rows">
            {visibleProfessionals.map((professional) => (
              <button
                type="button"
                className={`service-catalog-row service-catalog-row--professional${
                  professional.isActive ? "" : " is-inactive"
                }`}
                key={professional.id}
                onClick={(event) => onEdit(professional, event.currentTarget)}
                aria-label={`${professional.name} uzmanını düzenle`}
              >
                <ProfessionalAvatar
                  name={professional.name}
                  src={professional.photoUrl ?? undefined}
                  size="sm"
                />
                <span className="service-catalog-row__identity">
                  <strong>{professional.name}</strong>
                  <small>{professional.title}</small>
                </span>
                <span className="service-catalog-row__facts">
                  <strong>{professional.serviceIds.length} hizmet</strong>
                </span>
                <span className="service-catalog-row__status">
                  <b className={professional.isActive ? "is-active" : ""}>
                    {professional.isActive ? "Aktif" : "Pasif"}
                  </b>
                  <b className={professional.isOnlineBookable ? "is-online" : ""}>
                    {professional.isOnlineBookable ? "Online" : "Telefon"}
                  </b>
                </span>
                <CaretRightIcon
                  className="service-catalog-row__arrow"
                  size={18}
                  weight="bold"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
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

  const assignedCount = items.filter((item) => item.isAssigned).length;

  return (
    <section
      className="service-editor-section"
      aria-labelledby="professional-services-title"
    >
      <header className="service-editor-section__team-header">
        <span>
          <strong id="professional-services-title">Hizmet eşleşmesi</strong>
          <span>Sunduğu hizmetler, özel süre ve fiyat farkları</span>
        </span>
        {!loading && (
          <b>
            {assignedCount}/{items.length} seçili
          </b>
        )}
      </header>
      {loading ? (
        <div className="admin-skeleton professional-service-rows__skeleton" />
      ) : (
        <div className="professional-service-rows">
          {items.map((item) => (
            <article
              key={item.serviceId}
              className={`professional-service-row${item.isAssigned ? "" : " is-disabled"}`}
            >
              <header>
                <span>
                  <strong>{item.serviceName}</strong>
                  <small>
                    Salon varsayılanı: {item.salonDurationMinutes} dk ·{" "}
                    {formatMoney(item.salonPriceKurus)}
                  </small>
                </span>
                <Switch
                  checked={item.isAssigned}
                  onCheckedChange={(checked) =>
                    change(item.serviceId, { isAssigned: checked })
                  }
                  aria-label={`${item.serviceName} hizmetini ${
                    item.isAssigned ? "kaldır" : "sun"
                  }`}
                />
              </header>
              {item.isAssigned && (
                <div className="professional-service-row__fields">
                  <label className="service-field">
                    <span>Özel süre</span>
                    <span className="service-field__unit">
                      <Input
                        type="number"
                        min={5}
                        step={5}
                        placeholder={`${item.salonDurationMinutes}`}
                        value={item.durationMinutesOverride ?? ""}
                        onChange={(event) =>
                          change(item.serviceId, {
                            durationMinutesOverride: event.target.value
                              ? Number(event.target.value)
                              : null,
                          })
                        }
                      />
                      <b>dk</b>
                    </span>
                  </label>
                  <label className="service-field">
                    <span>Özel fiyat</span>
                    <span className="service-field__unit">
                      <Input
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
                      <b>₺</b>
                    </span>
                  </label>
                  <label className="service-field">
                    <span>Online rezervasyon</span>
                    <select
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
                  <label className="service-field">
                    <span>Ön tampon</span>
                    <span className="service-field__unit">
                      <Input
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
                      <b>dk</b>
                    </span>
                  </label>
                  <label className="service-field">
                    <span>Son tampon</span>
                    <span className="service-field__unit">
                      <Input
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
                      <b>dk</b>
                    </span>
                  </label>
                  <label className="service-field">
                    <span>
                      Serbest bekleme başlangıcı <small>İsteğe bağlı</small>
                    </span>
                    <span className="service-field__unit">
                      <Input
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
                      <b>dk</b>
                    </span>
                  </label>
                  <label className="service-field">
                    <span>Serbest bekleme süresi</span>
                    <span className="service-field__unit">
                      <Input
                        type="number"
                        min={0}
                        step={5}
                        disabled={item.processingStartOffsetMinutes === null}
                        value={item.processingDurationMinutes}
                        onChange={(event) =>
                          change(item.serviceId, {
                            processingDurationMinutes: Number(
                              event.target.value,
                            ),
                          })
                        }
                      />
                      <b>dk</b>
                    </span>
                  </label>
                </div>
              )}
              <footer className="professional-service-row__footer">
                <small>
                  Etkin değer: {item.effectiveDurationMinutes} dk ·{" "}
                  {formatMoney(item.effectivePriceKurus)}
                </small>
                <button
                  type="button"
                  className="service-editor-action service-editor-action--quiet"
                  disabled={savingId === item.serviceId}
                  onClick={() => void save(item)}
                >
                  {savingId === item.serviceId ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
      {error && (
        <p className="service-editor-error" role="alert">
          <WarningIcon size={18} weight="fill" aria-hidden="true" />
          <span>{error}</span>
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
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const dirty = value
    ? name !== value.name ||
      title !== value.title ||
      bio !== (value.bio ?? "") ||
      photoUrl !== (value.photoUrl ?? "") ||
      isActive !== value.isActive ||
      (isActive && isOnline) !== value.isOnlineBookable ||
      sortOrder !== value.sortOrder
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
    (value ? true : serviceIds.length > 0);
  const requestClose = () => {
    if (!dirty) onClose();
    else setDiscardDialogOpen(true);
  };

  const toggleService = (serviceId: string, checked: boolean) => {
    setServiceIds((current) =>
      checked
        ? current.includes(serviceId)
          ? current
          : [...current, serviceId]
        : current.filter((id) => id !== serviceId),
    );
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

  const assignableServices = services.filter((service) => service.isActive);

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
                <UserIcon size={22} weight="duotone" />
              </span>
              <span>
                <SheetTitle>
                  {value ? "Uzmanı düzenle" : "Yeni uzman"}
                </SheetTitle>
                <SheetDescription>
                  Kimlik bilgilerini, yayın durumunu ve hizmet eşleşmesini tek
                  yerden yönetin.
                </SheetDescription>
              </span>
            </SheetHeader>

            <div className="service-editor-scroll">
              <section
                className="service-editor-section"
                aria-labelledby="professional-basics-title"
              >
                <header>
                  <strong id="professional-basics-title">
                    Temel bilgiler
                  </strong>
                  <span>Müşterinin ekip sayfasında göreceği bilgiler</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field service-field--wide">
                    <span>Ad soyad</span>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      maxLength={100}
                      autoFocus
                    />
                  </label>
                  <label className="service-field">
                    <span>Unvan</span>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label className="service-field">
                    <span>Liste sırası</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={sortOrder}
                      onChange={(event) =>
                        setSortOrder(Number(event.target.value))
                      }
                    />
                  </label>
                  <label className="service-field service-field--wide">
                    <span>
                      Kısa açıklama <small>İsteğe bağlı</small>
                    </span>
                    <Textarea
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      maxLength={500}
                      placeholder="Uzmanlık alanını tek cümlede anlatın"
                    />
                  </label>
                  <label className="service-field service-field--wide">
                    <span>
                      Gerçek fotoğraf URL’si <small>İsteğe bağlı</small>
                    </span>
                    <Input
                      type="url"
                      value={photoUrl}
                      onChange={(event) => setPhotoUrl(event.target.value)}
                      placeholder="https://…"
                    />
                  </label>
                </div>
              </section>

              {!value && (
                <section
                  className="service-editor-section"
                  aria-labelledby="professional-services-title"
                >
                  <header className="service-editor-section__team-header">
                    <span>
                      <strong id="professional-services-title">
                        Sunduğu hizmetler
                      </strong>
                      <span>En az bir hizmet seçilmelidir</span>
                    </span>
                    <b>
                      {serviceIds.length}/{assignableServices.length} seçili
                    </b>
                  </header>
                  <div className="service-professional-list">
                    {assignableServices.map((service) => {
                      const checked = serviceIds.includes(service.id);
                      return (
                        <label
                          className={`service-professional-option${checked ? " is-selected" : ""}`}
                          key={service.id}
                        >
                          <span
                            className="service-professional-option__mark"
                            aria-hidden="true"
                          >
                            <ScissorsIcon size={17} weight="duotone" />
                          </span>
                          <span>
                            <strong>{service.name}</strong>
                            <small>{service.category}</small>
                          </span>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) =>
                              toggleService(service.id, nextChecked === true)
                            }
                            aria-label={`${service.name} hizmetini ${
                              checked ? "listeden çıkar" : "listeye ekle"
                            }`}
                          />
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}

              {value && <ProfessionalServiceSettings professionalId={value.id} />}

              <section
                className="service-editor-section"
                aria-labelledby="professional-publish-title"
              >
                <header>
                  <strong id="professional-publish-title">
                    Yayın durumu
                  </strong>
                  <span>Salon ve müşteri ekranındaki kullanılabilirlik</span>
                </header>
                <div className="service-publish-options">
                  <label>
                    <span>
                      <strong>Aktif uzman</strong>
                      <small>Salon randevularında seçilebilir.</small>
                    </span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </label>
                  <label className={!isActive ? "is-disabled" : ""}>
                    <span>
                      <strong>Online rezervasyon</strong>
                      <small>Müşteri ekranında görünür.</small>
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
                  {submitting ? "Kaydediliyor…" : "Uzmanı kaydet"}
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
              Bu uzmanda yaptığınız düzenlemeler henüz kaydedilmedi.
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
