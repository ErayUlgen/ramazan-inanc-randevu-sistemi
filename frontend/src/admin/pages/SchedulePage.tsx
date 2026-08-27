import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  AdminBusinessHours,
  AdminManagedProfessional,
  AdminScheduleBlock,
  AdminScheduleBlockKind,
} from "../admin.types";
import {
  cancelScheduleBlock,
  createScheduleBlock,
  deleteDateOverride,
  getAdminProfessionals,
  getBusinessHours,
  getScheduleBlocks,
  updateScheduleBlock,
  updateBusinessHours,
  upsertDateOverride,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";
import { formatDateLong, formatTime, todayInIstanbul } from "../lib/adminFormat";

const DAY_LABELS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];
const BLOCK_LABELS: Record<AdminScheduleBlockKind, string> = {
  BREAK: "Mola",
  UNAVAILABLE: "Müsait değil",
  TRAINING: "Eğitim",
  PERSONAL: "Kişisel",
  BRANCH_BLOCK: "Salon bloğu",
  OTHER: "Diğer",
};

type Props = {
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
};

export function SchedulePage({ branchId, onLogout, onNavigate }: Props) {
  const [hours, setHours] = useState<AdminBusinessHours | null>(null);
  const [days, setDays] = useState<AdminBusinessHours["days"]>([]);
  const [professionals, setProfessionals] = useState<
    AdminManagedProfessional[]
  >([]);
  const [blockDate, setBlockDate] = useState(todayInIstanbul());
  const [blocks, setBlocks] = useState<AdminScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondarySection, setSecondarySection] = useState<
    "overrides" | "blocks"
  >("overrides");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextHours, nextProfessionals] = await Promise.all([
        getBusinessHours(branchId),
        getAdminProfessionals(branchId),
      ]);
      setHours(nextHours);
      setDays(nextHours.days);
      setProfessionals(nextProfessionals.filter((item) => item.isActive));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Çalışma düzeni yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const loadBlocks = useCallback(async () => {
    try {
      setBlocks(await getScheduleBlocks(branchId, blockDate));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Zaman blokları yüklenemedi.",
      );
    }
  }, [blockDate, branchId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <AdminPageFrame
      section="schedule"
      eyebrow="Salon zamanı"
      title="Çalışma düzeni"
      description="Salon saatlerini, özel günleri ve geçici uzman bloklarını tek yerden yönetin."
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      {loading && (
        <div className="schedule-page-layout">
          <div className="admin-skeleton admin-skeleton--cards" />
          <div className="admin-skeleton admin-skeleton--cards" />
        </div>
      )}
      {!loading && hours && (
        <div className="schedule-page-layout">
          <WeeklyHoursPanel
            branchId={branchId}
            days={days}
            originalDays={hours.days}
            onDaysChange={setDays}
            onSaved={() => {
              setNotice("Haftalık çalışma saatleri güncellendi.");
              void load();
            }}
            onError={setError}
          />

          <section
            className="schedule-secondary"
            aria-label="Özel günler ve zaman blokları"
          >
            <div className="segmented-control schedule-segmented">
              <button
                type="button"
                className={secondarySection === "overrides" ? "is-selected" : ""}
                onClick={() => setSecondarySection("overrides")}
              >
                Özel günler
              </button>
              <button
                type="button"
                className={secondarySection === "blocks" ? "is-selected" : ""}
                onClick={() => setSecondarySection("blocks")}
              >
                Zaman blokları
              </button>
            </div>
            {secondarySection === "overrides" ? (
              <DateOverridePanel
                branchId={branchId}
                overrides={hours.overrides}
                onChanged={() => {
                  setNotice("Özel gün düzeni güncellendi.");
                  void load();
                }}
                onError={setError}
              />
            ) : (
              <BlockPanel
                branchId={branchId}
                date={blockDate}
                onDateChange={setBlockDate}
                professionals={professionals}
                blocks={blocks}
                onChanged={() => {
                  setNotice("Zaman blokları güncellendi.");
                  void loadBlocks();
                }}
                onError={setError}
              />
            )}
          </section>
        </div>
      )}
      {error && (
        <AdminErrorBanner
          title="Çalışma düzeni güncellenemedi"
          error={error}
          fallback="Değişikliği şu an uygulayamadık. Takvimi yenileyip yeniden deneyebilirsin."
          onRetry={() => {
            setError(null);
            void load();
          }}
          retryLabel="Takvimi yenile"
        />
      )}
      {notice && (
        <div className="admin-toast" role="status">
          {notice}
        </div>
      )}
    </AdminPageFrame>
  );
}

function WeeklyHoursPanel({
  branchId,
  days,
  originalDays,
  onDaysChange,
  onSaved,
  onError,
}: {
  branchId: string;
  days: AdminBusinessHours["days"];
  originalDays: AdminBusinessHours["days"];
  onDaysChange: (days: AdminBusinessHours["days"]) => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = JSON.stringify(days) !== JSON.stringify(originalDays);
  const invalidDays = days.filter((day) =>
    day.intervals.some((interval) => interval.endMinute <= interval.startMinute),
  );
  const valid = invalidDays.length === 0;

  const toggleOpen = (weekday: number, open: boolean) => {
    onDaysChange(
      days.map((day) =>
        day.weekday === weekday
          ? {
              ...day,
              intervals: open ? [{ startMinute: 600, endMinute: 1260 }] : [],
            }
          : day,
      ),
    );
  };

  const updateInterval = (
    weekday: number,
    index: number,
    field: "startMinute" | "endMinute",
    value: number,
  ) =>
    onDaysChange(
      days.map((day) =>
        day.weekday === weekday
          ? {
              ...day,
              intervals: day.intervals.map((interval, intervalIndex) =>
                intervalIndex === index
                  ? { ...interval, [field]: value }
                  : interval,
              ),
            }
          : day,
      ),
    );

  const addInterval = (weekday: number) =>
    onDaysChange(
      days.map((day) =>
        day.weekday === weekday
          ? {
              ...day,
              intervals: [
                ...day.intervals,
                {
                  startMinute: Math.min(
                    (day.intervals.at(-1)?.endMinute ?? 600) + 30,
                    1380,
                  ),
                  endMinute: Math.min(
                    (day.intervals.at(-1)?.endMinute ?? 600) + 150,
                    1440,
                  ),
                },
              ],
            }
          : day,
      ),
    );

  const removeInterval = (weekday: number, index: number) =>
    onDaysChange(
      days.map((day) =>
        day.weekday === weekday
          ? {
              ...day,
              intervals: day.intervals.filter(
                (_, intervalIndex) => intervalIndex !== index,
              ),
            }
          : day,
      ),
    );

  const save = () => {
    setSaving(true);
    setSaveError(null);
    void updateBusinessHours(branchId, days)
      .then(() => onSaved())
      .catch((reason: unknown) => {
        const message =
          reason instanceof Error
            ? reason.message
            : "Çalışma saatleri kaydedilemedi.";
        setSaveError(message);
        onError(message);
      })
      .finally(() => setSaving(false));
  };

  return (
    <section className="service-workbench schedule-hours-panel" aria-label="Haftalık salon saatleri">
      <header className="schedule-hours-panel__header">
        <span className="service-editor-header__icon" aria-hidden="true">
          <ClockIcon size={20} weight="duotone" />
        </span>
        <div>
          <strong>Haftalık salon saatleri</strong>
          <span>Tüm ekip için temel program</span>
        </div>
      </header>
      <div className="schedule-hours-rows">
        {days.map((day) => {
          const open = day.intervals.length > 0;
          return (
            <div className="schedule-hours-row" key={day.weekday}>
              <label className="schedule-hours-row__toggle">
                <Switch
                  checked={open}
                  onCheckedChange={(checked) => toggleOpen(day.weekday, checked)}
                />
                <span>{DAY_LABELS[day.weekday]}</span>
              </label>
              <div className="schedule-hours-row__intervals">
                {open ? (
                  <>
                    {day.intervals.map((interval, index) => (
                      <span
                        className="schedule-interval-chip"
                        key={`${day.weekday}-${index}`}
                      >
                        <Input
                          type="time"
                          value={minuteLabel(interval.startMinute)}
                          onChange={(event) =>
                            updateInterval(
                              day.weekday,
                              index,
                              "startMinute",
                              timeMinute(event.target.value),
                            )
                          }
                          aria-label={`${DAY_LABELS[day.weekday]} ${index + 1}. aralık açılış`}
                        />
                        <span aria-hidden="true">–</span>
                        <Input
                          type="time"
                          value={minuteLabel(interval.endMinute)}
                          onChange={(event) =>
                            updateInterval(
                              day.weekday,
                              index,
                              "endMinute",
                              timeMinute(event.target.value),
                            )
                          }
                          aria-label={`${DAY_LABELS[day.weekday]} ${index + 1}. aralık kapanış`}
                        />
                        <button
                          type="button"
                          className="schedule-interval-chip__remove"
                          onClick={() => removeInterval(day.weekday, index)}
                          aria-label={`${DAY_LABELS[day.weekday]} ${index + 1}. aralığı kaldır`}
                        >
                          <XIcon size={15} />
                        </button>
                      </span>
                    ))}
                    {day.intervals.length < 4 && (
                      <button
                        type="button"
                        className="schedule-add-interval"
                        onClick={() => addInterval(day.weekday)}
                      >
                        <PlusIcon size={15} weight="bold" /> Aralık ekle
                      </button>
                    )}
                  </>
                ) : (
                  <span className="schedule-hours-row__closed">Kapalı</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!valid && (
        <p className="service-editor-error" role="alert">
          <WarningIcon size={18} weight="fill" aria-hidden="true" />
          <span>
            Bitiş saati başlangıçtan sonra olmalı (
            {invalidDays.map((day) => DAY_LABELS[day.weekday]).join(", ")}
            ).
          </span>
        </p>
      )}
      {saveError && (
        <p className="service-editor-error" role="alert">
          <WarningIcon size={18} weight="fill" aria-hidden="true" />
          <span>{saveError}</span>
        </p>
      )}
      <footer className="service-editor-footer">
        <span aria-live="polite">
          {!dirty
            ? "Değişiklik yok"
            : valid
              ? "Kaydedilmeyi bekleyen değişiklikler var"
              : "Aralıkları kontrol edin"}
        </span>
        <div>
          <button
            type="button"
            className="service-editor-action service-editor-action--primary"
            disabled={saving || !dirty || !valid}
            onClick={save}
          >
            <FloppyDiskIcon size={18} weight="bold" />
            {saving ? "Kaydediliyor…" : "Haftalık programı kaydet"}
          </button>
        </div>
      </footer>
    </section>
  );
}

function DateOverridePanel({
  branchId,
  overrides,
  onChanged,
  onError,
}: {
  branchId: string;
  overrides: AdminBusinessHours["overrides"];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState<
    AdminBusinessHours["overrides"][number] | "new" | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<
    AdminBusinessHours["overrides"][number] | null
  >(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openEditor = (
    value: AdminBusinessHours["overrides"][number] | "new",
    trigger: HTMLButtonElement,
  ) => {
    lastTriggerRef.current = trigger;
    setEditing(value);
  };
  const closeEditor = () => {
    setEditing(null);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  };

  const sorted = [...overrides].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  return (
    <div className="schedule-secondary-panel">
      <div className="schedule-secondary-toolbar">
        <span>{overrides.length} özel gün tanımlı</span>
        <button
          type="button"
          className="admin-primary-button"
          onClick={(event) => openEditor("new", event.currentTarget)}
        >
          <PlusIcon size={17} weight="bold" /> Özel gün ekle
        </button>
      </div>
      {!sorted.length ? (
        <div className="service-catalog-empty">
          <CalendarBlankIcon size={26} weight="duotone" aria-hidden="true" />
          <strong>Tanımlı özel gün yok</strong>
          <p>Bayram, tatil veya farklı saatli bir gün eklemek için yukarıdan başlayın.</p>
        </div>
      ) : (
        <div className="admin-service-category__rows">
          {sorted.map((override) => (
            <div className="schedule-row" key={override.id}>
              <button
                type="button"
                className="schedule-row__main"
                onClick={(event) => openEditor(override, event.currentTarget)}
                aria-label={`${formatDateLong(override.date)} özel gününü düzenle`}
              >
                <span className="service-catalog-row__mark" aria-hidden="true">
                  <CalendarBlankIcon size={18} weight="duotone" />
                </span>
                <span className="service-catalog-row__identity">
                  <strong>{formatDateLong(override.date)}</strong>
                  <small>{override.note || "İç not eklenmedi"}</small>
                </span>
                <span className="service-catalog-row__facts">
                  <strong>
                    {override.isClosed
                      ? "Kapalı"
                      : override.intervals
                          .map(
                            (item) =>
                              `${minuteLabel(item.startMinute)}–${minuteLabel(item.endMinute)}`,
                          )
                          .join(", ")}
                  </strong>
                </span>
                <CaretRightIcon
                  className="service-catalog-row__arrow"
                  size={18}
                  weight="bold"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="schedule-row__delete"
                onClick={() => setDeleteTarget(override)}
                aria-label={`${formatDateLong(override.date)} özel gününü kaldır`}
              >
                <TrashIcon size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <DateOverrideEditor
          branchId={branchId}
          value={editing === "new" ? null : editing}
          onClose={closeEditor}
          onSaved={() => {
            setEditing(null);
            onChanged();
            window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
          }}
        />
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Özel gün kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? formatDateLong(deleteTarget.date) : ""} için
              yeniden haftalık çalışma programı geçerli olacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                void deleteDateOverride(branchId, deleteTarget.date)
                  .then(() => {
                    setDeleteTarget(null);
                    onChanged();
                  })
                  .catch((reason: unknown) =>
                    onError(
                      reason instanceof Error
                        ? reason.message
                        : "Özel gün kaldırılamadı.",
                    ),
                  );
              }}
            >
              Özel günü kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DateOverrideEditor({
  branchId,
  value,
  onClose,
  onSaved,
}: {
  branchId: string;
  value: AdminBusinessHours["overrides"][number] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(value?.date ?? "");
  const [isClosed, setIsClosed] = useState(value?.isClosed ?? true);
  const [startTime, setStartTime] = useState(
    minuteLabel(value?.intervals[0]?.startMinute ?? 600),
  );
  const [endTime, setEndTime] = useState(
    minuteLabel(value?.intervals[0]?.endMinute ?? 1260),
  );
  const [note, setNote] = useState(value?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const dirty = value
    ? date !== value.date ||
      isClosed !== value.isClosed ||
      note !== (value.note ?? "") ||
      (!isClosed &&
        (timeMinute(startTime) !== (value.intervals[0]?.startMinute ?? -1) ||
          timeMinute(endTime) !== (value.intervals[0]?.endMinute ?? -1)))
    : Boolean(date || note.trim() || !isClosed);
  const valid =
    date.trim().length > 0 &&
    (isClosed || timeMinute(endTime) > timeMinute(startTime));
  const requestClose = () => {
    if (!dirty) onClose();
    else setDiscardDialogOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await upsertDateOverride(branchId, date, {
        isClosed,
        note: note.trim() || undefined,
        intervals: isClosed
          ? []
          : [
              {
                startMinute: timeMinute(startTime),
                endMinute: timeMinute(endTime),
              },
            ],
      });
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Özel gün kaydedilemedi.",
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
                <CalendarBlankIcon size={22} weight="duotone" />
              </span>
              <span>
                <SheetTitle>
                  {value ? "Özel günü düzenle" : "Yeni özel gün"}
                </SheetTitle>
                <SheetDescription>
                  Tatil, tam kapalı gün veya farklı çalışma saati tanımlayın.
                </SheetDescription>
              </span>
            </SheetHeader>

            <div className="service-editor-scroll">
              <section
                className="service-editor-section"
                aria-labelledby="override-date-title"
              >
                <header>
                  <strong id="override-date-title">Tarih</strong>
                  <span>Haftalık programın yerine geçer</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field service-field--wide">
                    <span>Tarih</span>
                    <Input
                      type="date"
                      value={date}
                      disabled={Boolean(value)}
                      onChange={(event) => setDate(event.target.value)}
                      required
                      autoFocus={!value}
                    />
                  </label>
                </div>
              </section>

              <section
                className="service-editor-section"
                aria-labelledby="override-hours-title"
              >
                <header>
                  <strong id="override-hours-title">Saatler</strong>
                  <span>Kapalı ya da özel saat aralığı</span>
                </header>
                <div className="service-publish-options">
                  <label>
                    <span>
                      <strong>Tam gün kapalı</strong>
                      <small>Salon o gün hiç randevu almaz.</small>
                    </span>
                    <Switch checked={isClosed} onCheckedChange={setIsClosed} />
                  </label>
                </div>
                {!isClosed && (
                  <div className="service-editor-grid">
                    <label className="service-field">
                      <span>Açılış</span>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                      />
                    </label>
                    <label className="service-field">
                      <span>Kapanış</span>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                      />
                    </label>
                  </div>
                )}
              </section>

              <section
                className="service-editor-section"
                aria-labelledby="override-note-title"
              >
                <header>
                  <strong id="override-note-title">İç not</strong>
                  <span>İsteğe bağlı, ekip içi hatırlatma</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field service-field--wide">
                    <span>Not</span>
                    <Textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      maxLength={300}
                      placeholder="Örn. Bayramın ilk günü"
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
                  {submitting
                    ? "Kaydediliyor…"
                    : value
                      ? "Özel günü güncelle"
                      : "Özel günü ekle"}
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
              Bu özel günde yaptığınız düzenlemeler henüz kaydedilmedi.
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

function BlockPanel({
  branchId,
  date,
  onDateChange,
  professionals,
  blocks,
  onChanged,
  onError,
}: {
  branchId: string;
  date: string;
  onDateChange: (date: string) => void;
  professionals: AdminManagedProfessional[];
  blocks: AdminScheduleBlock[];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState<AdminScheduleBlock | "new" | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<AdminScheduleBlock | null>(
    null,
  );
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openEditor = (
    value: AdminScheduleBlock | "new",
    trigger: HTMLButtonElement,
  ) => {
    lastTriggerRef.current = trigger;
    setEditing(value);
  };
  const closeEditor = () => {
    setEditing(null);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  };

  return (
    <div className="schedule-secondary-panel">
      <div className="schedule-secondary-toolbar">
        <label className="service-search schedule-date-filter" htmlFor="schedule-block-date">
          <CalendarBlankIcon size={18} aria-hidden="true" />
          <span className="sr-only">Gösterilen gün</span>
          <input
            id="schedule-block-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="admin-primary-button"
          onClick={(event) => openEditor("new", event.currentTarget)}
        >
          <PlusIcon size={17} weight="bold" /> Blok ekle
        </button>
      </div>
      {!blocks.length ? (
        <div className="service-catalog-empty">
          <ClockIcon size={26} weight="duotone" aria-hidden="true" />
          <strong>Bu gün için blok yok</strong>
          <p>Mola, eğitim veya izin gibi geçici müsaitlik durumlarını buradan ekleyin.</p>
        </div>
      ) : (
        <div className="admin-service-category__rows">
          {blocks.map((block) => (
            <div className="schedule-row" key={block.id}>
              <button
                type="button"
                className="schedule-row__main"
                onClick={(event) => openEditor(block, event.currentTarget)}
                aria-label={`${block.title} bloğunu düzenle`}
              >
                <span className="service-catalog-row__mark" aria-hidden="true">
                  <ClockIcon size={18} weight="duotone" />
                </span>
                <span className="service-catalog-row__identity">
                  <strong>{block.title}</strong>
                  <small>
                    {block.professional?.name ?? "Tüm salon"} ·{" "}
                    {BLOCK_LABELS[block.kind]}
                  </small>
                </span>
                <span className="service-catalog-row__facts">
                  <strong>
                    {formatTime(block.startAt)}–{formatTime(block.endAt)}
                  </strong>
                </span>
                <CaretRightIcon
                  className="service-catalog-row__arrow"
                  size={18}
                  weight="bold"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="schedule-row__delete"
                onClick={() => setCancelTarget(block)}
                aria-label={`${block.title} bloğunu kaldır`}
              >
                <TrashIcon size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <BlockEditor
          branchId={branchId}
          date={date}
          professionals={professionals}
          value={editing === "new" ? null : editing}
          onClose={closeEditor}
          onSaved={() => {
            setEditing(null);
            onChanged();
            window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
          }}
        />
      )}

      <CancelBlockDialog
        block={cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onCancelled={() => {
          setCancelTarget(null);
          onChanged();
        }}
        onError={onError}
      />
    </div>
  );
}

function BlockEditor({
  branchId,
  date,
  professionals,
  value,
  onClose,
  onSaved,
}: {
  branchId: string;
  date: string;
  professionals: AdminManagedProfessional[];
  value: AdminScheduleBlock | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<AdminScheduleBlockKind>(value?.kind ?? "BREAK");
  const [professionalId, setProfessionalId] = useState(
    value?.professional?.id ?? professionals[0]?.id ?? "",
  );
  const [blockDate, setBlockDate] = useState(
    value ? dateInIstanbul(value.startAt) : date,
  );
  const [title, setTitle] = useState(value?.title ?? "Mola");
  const [internalNote, setInternalNote] = useState(value?.internalNote ?? "");
  const [startTime, setStartTime] = useState(
    value ? formatTime(value.startAt) : "13:00",
  );
  const [endTime, setEndTime] = useState(
    value ? formatTime(value.endAt) : "13:30",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const dirty = value
    ? kind !== value.kind ||
      (kind !== "BRANCH_BLOCK" &&
        professionalId !== (value.professional?.id ?? "")) ||
      blockDate !== dateInIstanbul(value.startAt) ||
      title !== value.title ||
      internalNote !== (value.internalNote ?? "") ||
      startTime !== formatTime(value.startAt) ||
      endTime !== formatTime(value.endAt)
    : Boolean(
        kind !== "BREAK" ||
        professionalId !== (professionals[0]?.id ?? "") ||
        title.trim() !== "Mola" ||
        internalNote.trim() ||
        blockDate !== date ||
        startTime !== "13:00" ||
        endTime !== "13:30",
      );
  const valid =
    title.trim().length >= 2 &&
    timeMinute(endTime) > timeMinute(startTime) &&
    (kind === "BRANCH_BLOCK" || Boolean(professionalId));
  const requestClose = () => {
    if (!dirty) onClose();
    else setDiscardDialogOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        branchId,
        ...(kind === "BRANCH_BLOCK" ? {} : { professionalId }),
        kind,
        title: title.trim(),
        internalNote: internalNote.trim() || undefined,
        date: blockDate,
        startTime,
        endTime,
      };
      if (value) {
        await updateScheduleBlock(value.id, payload);
      } else {
        await createScheduleBlock(payload);
      }
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Zaman bloğu kaydedilemedi.",
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
                <ClockIcon size={22} weight="duotone" />
              </span>
              <span>
                <SheetTitle>{value ? "Bloğu düzenle" : "Yeni zaman bloğu"}</SheetTitle>
                <SheetDescription>
                  Mola, eğitim veya izin gibi geçici müsaitlik durumlarını tanımlayın.
                </SheetDescription>
              </span>
            </SheetHeader>

            <div className="service-editor-scroll">
              <section
                className="service-editor-section"
                aria-labelledby="block-basics-title"
              >
                <header>
                  <strong id="block-basics-title">Temel bilgiler</strong>
                  <span>Blok türü ve kapsamı</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field">
                    <span>Blok türü</span>
                    <select
                      value={kind}
                      onChange={(event) => {
                        const next = event.target.value as AdminScheduleBlockKind;
                        setKind(next);
                        if (next === "BREAK" && !title.trim()) setTitle("Mola");
                      }}
                    >
                      {Object.entries(BLOCK_LABELS).map(([optionValue, label]) => (
                        <option value={optionValue} key={optionValue}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {kind !== "BRANCH_BLOCK" && (
                    <label className="service-field">
                      <span>Uzman</span>
                      <select
                        value={professionalId}
                        onChange={(event) => setProfessionalId(event.target.value)}
                      >
                        {professionals.map((professional) => (
                          <option value={professional.id} key={professional.id}>
                            {professional.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="service-field service-field--wide">
                    <span>Başlık</span>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={80}
                      required
                    />
                  </label>
                  <label className="service-field service-field--wide">
                    <span>
                      İç not <small>İsteğe bağlı</small>
                    </span>
                    <Textarea
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      maxLength={1000}
                    />
                  </label>
                </div>
              </section>

              <section
                className="service-editor-section"
                aria-labelledby="block-time-title"
              >
                <header>
                  <strong id="block-time-title">Zaman</strong>
                  <span>Tarih ve saat aralığı</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field">
                    <span>Tarih</span>
                    <Input
                      type="date"
                      value={blockDate}
                      onChange={(event) => setBlockDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="service-field">
                    <span>Başlangıç</span>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </label>
                  <label className="service-field">
                    <span>Bitiş</span>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
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
                  {submitting ? "Kaydediliyor…" : value ? "Bloğu güncelle" : "Bloğu kaydet"}
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
              Bu blokta yaptığınız düzenlemeler henüz kaydedilmedi.
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

function CancelBlockDialog({
  block,
  onOpenChange,
  onCancelled,
  onError,
}: {
  block: AdminScheduleBlock | null;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (block) setReason("");
  }, [block]);

  const valid = reason.trim().length >= 3;

  return (
    <AlertDialog open={Boolean(block)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {block ? `“${block.title}” bloğu kaldırılsın mı?` : "Blok kaldırılsın mı?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Kaldırma nedeni ekip geçmişinde saklanır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="service-field service-field--wide alert-dialog-field">
          <span>Kaldırma nedeni</span>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder="Örn. Uzman izne çıktı, blok artık gerekmiyor"
            autoFocus
          />
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!valid || submitting}
            onClick={() => {
              if (!block || !valid) return;
              setSubmitting(true);
              void cancelScheduleBlock(block.id, reason.trim())
                .then(() => onCancelled())
                .catch((cancelReason: unknown) =>
                  onError(
                    cancelReason instanceof Error
                      ? cancelReason.message
                      : "Blok kaldırılamadı.",
                  ),
                )
                .finally(() => setSubmitting(false));
            }}
          >
            {submitting ? "Kaldırılıyor…" : "Bloğu kaldır"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function minuteLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function timeMinute(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function dateInIstanbul(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}
