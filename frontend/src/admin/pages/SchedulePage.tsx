import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { CalendarXIcon as CalendarOff } from "@phosphor-icons/react/dist/csr/CalendarX";
import { CalendarPlusIcon as CalendarPlus } from "@phosphor-icons/react/dist/csr/CalendarPlus";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import { SpinnerGapIcon as LoaderCircle } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { PencilIcon as Pencil } from "@phosphor-icons/react/dist/csr/Pencil";
import { TrashIcon as Trash2 } from "@phosphor-icons/react/dist/csr/Trash";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type {
  AdminBusinessHours,
  AdminManagedProfessional,
  AdminScheduleBlock,
  AdminScheduleBlockKind,
  AdminTimeInterval,
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
import {
  formatDateLong,
  formatTime,
  todayInIstanbul,
} from "../lib/adminFormat";
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
  const [savingHours, setSavingHours] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const updateInterval = (
    weekday: number,
    index: number,
    field: keyof AdminTimeInterval,
    value: number,
  ) =>
    setDays((current) =>
      current.map((day) =>
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

  return (
    <AdminPageFrame
      section="schedule"
      eyebrow="Salon zamanı"
      title="Çalışma düzeni"
      description="Salon saatlerini, özel günleri ve geçici uzman bloklarını tek takvim kuralında yönetin."
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      {loading && (
        <div className="schedule-admin-layout">
          <div className="admin-skeleton admin-skeleton--timeline" />
          <div className="admin-skeleton admin-skeleton--timeline" />
        </div>
      )}
      {!loading && hours && (
        <div className="schedule-admin-layout">
          <section className="schedule-panel weekly-hours-panel">
            <header>
              <span>
                <small>Tüm ekip için temel program</small>
                <h2>Haftalık salon saatleri</h2>
              </span>
              <span className="schedule-header-icon">
                <Clock3 size={21} />
              </span>
            </header>
            <div className="weekly-hours-list">
              {days.map((day) => (
                <article key={day.weekday}>
                  <label className="day-toggle">
                    <input
                      type="checkbox"
                      checked={day.intervals.length > 0}
                      onChange={(event) =>
                        setDays((current) =>
                          current.map((item) =>
                            item.weekday === day.weekday
                              ? {
                                  ...item,
                                  intervals: event.target.checked
                                    ? [{ startMinute: 600, endMinute: 1260 }]
                                    : [],
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <span>
                      <strong>{DAY_LABELS[day.weekday]}</strong>
                      <small>{day.intervals.length ? "Açık" : "Kapalı"}</small>
                    </span>
                  </label>
                  <div className="day-intervals">
                    {day.intervals.map((interval, index) => (
                      <div key={`${day.weekday}-${index}`}>
                        <input
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
                          aria-label={`${DAY_LABELS[day.weekday]} açılış`}
                        />
                        <span>–</span>
                        <input
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
                          aria-label={`${DAY_LABELS[day.weekday]} kapanış`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDays((current) =>
                              current.map((item) =>
                                item.weekday === day.weekday
                                  ? {
                                      ...item,
                                      intervals: item.intervals.filter(
                                        (_, intervalIndex) =>
                                          intervalIndex !== index,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                          aria-label="Aralığı kaldır"
                        >
                          <XIcon size={17} />
                        </button>
                      </div>
                    ))}
                    {day.intervals.length > 0 && day.intervals.length < 4 && (
                      <button
                        type="button"
                        className="add-interval-button"
                        onClick={() =>
                          setDays((current) =>
                            current.map((item) =>
                              item.weekday === day.weekday
                                ? {
                                    ...item,
                                    intervals: [
                                      ...item.intervals,
                                      {
                                        startMinute: Math.min(
                                          (item.intervals.at(-1)?.endMinute ??
                                            600) + 30,
                                          1380,
                                        ),
                                        endMinute: Math.min(
                                          (item.intervals.at(-1)?.endMinute ??
                                            600) + 150,
                                          1440,
                                        ),
                                      },
                                    ],
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <PlusIcon size={15} /> Ara sonrası çalışma ekle
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <footer>
              <button
                type="button"
                className="admin-primary-button"
                disabled={savingHours}
                onClick={() => {
                  setSavingHours(true);
                  setError(null);
                  void updateBusinessHours(branchId, days)
                    .then(() => {
                      setNotice("Haftalık çalışma saatleri güncellendi.");
                      void load();
                    })
                    .catch((reason: unknown) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Çalışma saatleri kaydedilemedi.",
                      ),
                    )
                    .finally(() => setSavingHours(false));
                }}
              >
                {savingHours ? "Kaydediliyor…" : "Haftalık programı kaydet"}
              </button>
            </footer>
          </section>

          <div className="schedule-side-stack">
            <DateOverridePanel
              branchId={branchId}
              overrides={hours.overrides}
              onChanged={() => {
                setNotice("Özel gün düzeni güncellendi.");
                void load();
              }}
              onError={setError}
            />
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
          </div>
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
  const [date, setDate] = useState("");
  const [isClosed, setIsClosed] = useState(true);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("21:00");
  const [note, setNote] = useState("");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDate, setDeleteDate] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
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
      setDate("");
      setNote("");
      setEditingDate(null);
      onChanged();
    } catch (reason) {
      onError(
        reason instanceof Error ? reason.message : "Özel gün kaydedilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="schedule-panel date-override-panel">
      <header>
        <span>
          <small>İstisnalar</small>
          <h2>Özel günler</h2>
        </span>
        <span className="schedule-header-icon">
          <CalendarBlankIcon size={22} weight="duotone" />
        </span>
      </header>
      <form onSubmit={submit}>
        <label>
          <span>Tarih</span>
          <input
            type="date"
            value={date}
            disabled={Boolean(editingDate)}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <label className="admin-switch-row">
          <input
            type="checkbox"
            checked={isClosed}
            onChange={(event) => setIsClosed(event.target.checked)}
          />
          <span>
            <strong>Tam gün kapalı</strong>
            <small>Haftalık programın yerine geçer.</small>
          </span>
        </label>
        {!isClosed && (
          <div className="override-time-row">
            <label>
              <span>Açılış</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>
            <label>
              <span>Kapanış</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
          </div>
        )}
        <label>
          <span>İç not</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={300}
            placeholder="Örn. Bayramın ilk günü"
          />
        </label>
        <div className="block-form-actions">
          {editingDate && (
            <button
              type="button"
              className="admin-quiet-button"
              onClick={() => {
                setEditingDate(null);
                setDate("");
                setNote("");
              }}
            >
              Düzenlemeyi bırak
            </button>
          )}
          <Button type="submit" disabled={submitting || !date}>
            {submitting ? (
              <>
                <LoaderCircle className="is-spinning" /> Kaydediliyor
              </>
            ) : (
              <>
                <CalendarPlus />
                {editingDate ? "Özel günü güncelle" : "Özel günü ekle"}
              </>
            )}
          </Button>
        </div>
      </form>
      <div className="override-list">
        {overrides.map((override) => (
          <article key={override.id}>
            <span>
              <strong>{formatDateLong(override.date)}</strong>
              <small>
                {override.isClosed
                  ? "Kapalı"
                  : override.intervals
                      .map(
                        (item) =>
                          `${minuteLabel(item.startMinute)}–${minuteLabel(item.endMinute)}`,
                      )
                      .join(", ")}
                {override.note ? ` · ${override.note}` : ""}
              </small>
            </span>
            <span className="override-list__actions">
              <Button
                size="icon"
                variant="outline"
                type="button"
                aria-label="Özel günü düzenle"
                onClick={() => {
                  setEditingDate(override.date);
                  setDate(override.date);
                  setIsClosed(override.isClosed);
                  setNote(override.note ?? "");
                  setStartTime(
                    minuteLabel(override.intervals[0]?.startMinute ?? 600),
                  );
                  setEndTime(
                    minuteLabel(override.intervals[0]?.endMinute ?? 1260),
                  );
                }}
              >
                <Pencil />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                type="button"
                onClick={() => setDeleteDate(override.date)}
                aria-label="Özel günü kaldır"
              >
                <Trash2 />
              </Button>
            </span>
          </article>
        ))}
        {!overrides.length && (
          <p className="admin-inline-empty">Tanımlı özel gün yok.</p>
        )}
      </div>
      <AlertDialog
        open={Boolean(deleteDate)}
        onOpenChange={(open) => !open && setDeleteDate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Özel gün kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu tarihte yeniden haftalık çalışma programı geçerli olacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteDate) return;
                void deleteDateOverride(branchId, deleteDate)
                  .then(() => {
                    setDeleteDate(null);
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
    </section>
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
  const [kind, setKind] = useState<AdminScheduleBlockKind>("BREAK");
  const [professionalId, setProfessionalId] = useState(
    professionals[0]?.id ?? "",
  );
  const [title, setTitle] = useState("Mola");
  const [internalNote, setInternalNote] = useState("");
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("13:30");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!professionalId && professionals[0])
      setProfessionalId(professionals[0].id);
  }, [professionalId, professionals]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        branchId,
        ...(kind === "BRANCH_BLOCK" ? {} : { professionalId }),
        kind,
        title: title.trim(),
        internalNote: internalNote.trim() || undefined,
        date,
        startTime,
        endTime,
      };
      if (editingId) {
        await updateScheduleBlock(editingId, payload);
      } else {
        await createScheduleBlock(payload);
      }
      setEditingId(null);
      onChanged();
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "Zaman bloğu oluşturulamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="schedule-panel block-panel">
      <header>
        <span>
          <small>Geçici müsaitlik</small>
          <h2>Zaman blokları</h2>
        </span>
        <span className="schedule-header-icon">
          <Clock3 size={21} />
        </span>
      </header>
      <label className="block-date-filter">
        <span>Gösterilen gün</span>
        <input
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </label>
      <form onSubmit={submit}>
        <div className="admin-form-grid">
          <label>
            <span>Blok türü</span>
            <select
              value={kind}
              onChange={(event) => {
                const next = event.target.value as AdminScheduleBlockKind;
                setKind(next);
                if (next === "BREAK") setTitle("Mola");
              }}
            >
              {Object.entries(BLOCK_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {kind !== "BRANCH_BLOCK" && (
            <label>
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
          <label className={kind === "BRANCH_BLOCK" ? "is-full" : ""}>
            <span>Başlık</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label className="is-full">
            <span>
              İç not <small>isteğe bağlı</small>
            </span>
            <input
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              maxLength={1000}
            />
          </label>
          <label>
            <span>Başlangıç</span>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            <span>Bitiş</span>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
        </div>
        <div className="block-form-actions">
          {editingId && (
            <button
              type="button"
              className="admin-quiet-button"
              onClick={() => setEditingId(null)}
            >
              Düzenlemeyi bırak
            </button>
          )}
          <Button
            type="submit"
            disabled={
              submitting || (!professionalId && kind !== "BRANCH_BLOCK")
            }
          >
            {submitting ? (
              <>
                <LoaderCircle className="is-spinning" /> Kaydediliyor
              </>
            ) : (
              <>
                <CalendarOff />
                {editingId ? "Bloğu güncelle" : "Zamanı bloke et"}
              </>
            )}
          </Button>
        </div>
      </form>
      <div className="block-list">
        {blocks.map((block) => (
          <article key={block.id}>
            <span className="block-list__time">
              <strong>
                {formatTime(block.startAt)}–{formatTime(block.endAt)}
              </strong>
              <small>{BLOCK_LABELS[block.kind]}</small>
            </span>
            <span>
              <strong>{block.title}</strong>
              <small>{block.professional?.name ?? "Tüm salon"}</small>
            </span>
            <span className="block-list__actions">
              <button
                type="button"
                onClick={() => {
                  setEditingId(block.id);
                  setKind(block.kind);
                  setProfessionalId(block.professional?.id ?? "");
                  setTitle(block.title);
                  setInternalNote(block.internalNote ?? "");
                  setStartTime(formatTime(block.startAt));
                  setEndTime(formatTime(block.endAt));
                }}
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={() =>
                  void cancelScheduleBlock(
                    block.id,
                    "Yönetici tarafından kaldırıldı",
                  )
                    .then(onChanged)
                    .catch((reason: unknown) =>
                      onError(
                        reason instanceof Error
                          ? reason.message
                          : "Blok kaldırılamadı.",
                      ),
                    )
                }
              >
                Kaldır
              </button>
            </span>
          </article>
        ))}
        {!blocks.length && (
          <p className="admin-inline-empty">
            Bu gün için aktif zaman bloğu yok.
          </p>
        )}
      </div>
    </section>
  );
}

function minuteLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function timeMinute(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
