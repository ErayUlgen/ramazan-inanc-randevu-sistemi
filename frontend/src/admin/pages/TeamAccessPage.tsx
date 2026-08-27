import { KeyIcon as KeyRound } from "@phosphor-icons/react/dist/csr/Key";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { SignOutIcon as LogOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { UserGearIcon as UserRoundCog } from "@phosphor-icons/react/dist/csr/UserGear";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import type {
  AdminManagedProfessional,
  AdminRole,
  AdminTeamAccess,
} from "../admin.types";
import {
  createTeamAccess,
  getAdminProfessionals,
  getTeamAccess,
  resetTeamPassword,
  revokeTeamSessions,
  updateTeamAccess,
} from "../api/adminApi";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";

type Props = {
  branchId: string;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
  role?: AdminRole;
};

export function TeamAccessPage({
  branchId,
  onLogout,
  onNavigate,
  role,
}: Props) {
  const [users, setUsers] = useState<AdminTeamAccess[]>([]);
  const [professionals, setProfessionals] = useState<
    AdminManagedProfessional[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatorOpen, setCreatorOpen] = useState(false);
  const creatorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminTeamAccess | null>(
    null,
  );
  const [revokeTarget, setRevokeTarget] = useState<AdminTeamAccess | null>(
    null,
  );
  const [deactivateTarget, setDeactivateTarget] =
    useState<AdminTeamAccess | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextUsers, nextProfessionals] = await Promise.all([
        getTeamAccess(),
        getAdminProfessionals(branchId),
      ]);
      setUsers(nextUsers);
      setProfessionals(nextProfessionals.filter((item) => item.isActive));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Ekip erişimleri yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeCreator = () => {
    setCreatorOpen(false);
    window.requestAnimationFrame(() => creatorTriggerRef.current?.focus());
  };

  return (
    <AdminPageFrame
      section="team"
      eyebrow="Yetki ve güvenlik"
      title="Ekip erişimi"
      description="Salon ekibine yalnız görevleri için gereken alanları aç; vardiya veya puantaj yönetimine dönüşmeden güvenli kal."
      onLogout={onLogout}
      onNavigate={onNavigate}
      role={role}
      actions={
        <button
          type="button"
          className="admin-primary-button"
          onClick={(event) => {
            creatorTriggerRef.current = event.currentTarget;
            setCreatorOpen(true);
          }}
        >
          <Plus size={19} weight="bold" />
          Ekip üyesi ekle
        </button>
      }
    >
      {error && (
        <AdminErrorBanner
          title="Ekip erişimi güncellenemedi"
          error={error}
          fallback="İşlem şu anda tamamlanamadı."
          onRetry={() => void load()}
        />
      )}
      <section className="service-workbench" aria-label="Salon ekibi">
        <div className="service-workbench__toolbar">
          <span className="team-access-toolbar-title">
            <UserRoundCog aria-hidden="true" />
            Aktif yetkiler
          </span>
          <dl className="service-workbench__summary" aria-label="Ekip özeti">
            <div>
              <dt>Kayıtlı kullanıcı</dt>
              <dd>{loading ? "–" : users.length}</dd>
            </div>
          </dl>
        </div>

        {loading ? (
          <div className="admin-skeleton admin-skeleton--cards" />
        ) : users.length ? (
          <div className="team-access-list">
            {users.map((user) => (
              <article className="team-access-row" key={user.id}>
                <span className="team-access-row__avatar" aria-hidden="true">
                  {initials(user.displayName)}
                </span>
                <span className="team-access-row__identity">
                  <strong>{user.displayName}</strong>
                  <small>
                    @{user.username} · {roleLabel(user.role)}
                    {user.professional ? ` · ${user.professional.name}` : ""}
                  </small>
                </span>
                <span className="team-access-row__state">
                  <b className={user.isActive ? "is-active" : ""}>
                    {user.isActive ? "Aktif" : "Kapalı"}
                  </b>
                  <small>{user.activeSessionCount} açık oturum</small>
                </span>
                <span className="team-access-row__actions">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`${user.displayName} için parolayı sıfırla`}
                    title="Parolayı sıfırla"
                    onClick={() => setResetTarget(user)}
                  >
                    <KeyRound />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`${user.displayName} için tüm oturumları kapat`}
                    title="Tüm oturumları kapat"
                    disabled={!user.activeSessionCount}
                    onClick={() => setRevokeTarget(user)}
                  >
                    <LogOut />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (user.isActive) {
                        setDeactivateTarget(user);
                        return;
                      }
                      void updateTeamAccess(user.id, { isActive: true })
                        .then(() => {
                          toast.success(
                            `${user.displayName} için erişim yeniden açıldı.`,
                          );
                          void load();
                        })
                        .catch((reason: unknown) =>
                          setError(
                            reason instanceof Error
                              ? reason.message
                              : "Hesap durumu değiştirilemedi.",
                          ),
                        );
                    }}
                  >
                    {user.isActive ? "Erişimi kapat" : "Erişimi aç"}
                  </Button>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="service-catalog-empty">
            <UserRoundCog size={26} weight="duotone" aria-hidden="true" />
            <strong>Henüz ekip üyesi yok</strong>
            <p>
              "Ekip üyesi ekle" ile resepsiyon, uzman veya sahip hesabı
              oluştur.
            </p>
          </div>
        )}
      </section>

      {creatorOpen && (
        <TeamMemberCreateSheet
          professionals={professionals}
          onClose={closeCreator}
          onSaved={() => {
            setCreatorOpen(false);
            toast.success("Personel erişimi oluşturuldu.");
            void load();
            window.requestAnimationFrame(() =>
              creatorTriggerRef.current?.focus(),
            );
          }}
        />
      )}

      <ResetPasswordDialog
        user={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        onDone={() => {
          setResetTarget(null);
          toast.success("Parola yenilendi, açık oturumlar kapatıldı.");
        }}
        onError={setError}
      />

      <AlertDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <LogOut size={22} weight="duotone" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {revokeTarget
                ? `${revokeTarget.displayName} için tüm oturumlar kapatılsın mı?`
                : "Tüm oturumlar kapatılsın mı?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.activeSessionCount ?? 0} açık oturum hemen
              kapanır; kullanıcı yeniden giriş yapana kadar panele erişemez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!revokeTarget) return;
                const target = revokeTarget;
                void revokeTeamSessions(target.id)
                  .then(() => {
                    toast.success("Oturumlar kapatıldı.");
                    void load();
                  })
                  .catch((reason: unknown) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Oturumlar kapatılamadı.",
                    ),
                  )
                  .finally(() => setRevokeTarget(null));
              }}
            >
              Oturumları kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <WarningIcon size={22} weight="duotone" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {deactivateTarget
                ? `${deactivateTarget.displayName} için erişim kapatılsın mı?`
                : "Erişim kapatılsın mı?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu kullanıcı artık yönetici paneline giriş yapamaz; açık
              oturumları da hemen kapanır. Erişim istendiğinde yeniden
              açılabilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deactivateTarget) return;
                const target = deactivateTarget;
                void updateTeamAccess(target.id, { isActive: false })
                  .then(() => {
                    toast.success(`${target.displayName} için erişim kapatıldı.`);
                    void load();
                  })
                  .catch((reason: unknown) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Hesap durumu değiştirilemedi.",
                    ),
                  )
                  .finally(() => setDeactivateTarget(null));
              }}
            >
              Erişimi kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageFrame>
  );
}

function TeamMemberCreateSheet({
  professionals,
  onClose,
  onSaved,
}: {
  professionals: AdminManagedProfessional[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teamRole, setTeamRole] = useState<AdminRole>("RECEPTIONIST");
  const [professionalId, setProfessionalId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const dirty = Boolean(
    displayName.trim() ||
      username.trim() ||
      password ||
      professionalId ||
      teamRole !== "RECEPTIONIST",
  );
  const valid =
    displayName.trim().length >= 2 &&
    username.trim().length >= 3 &&
    password.length >= 8 &&
    (teamRole !== "PROFESSIONAL" || Boolean(professionalId));

  const requestClose = () => {
    if (!dirty) onClose();
    else setDiscardDialogOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createTeamAccess({
        username: username.trim(),
        displayName: displayName.trim(),
        password,
        role: teamRole,
        professionalId: teamRole === "PROFESSIONAL" ? professionalId : null,
      });
      onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Personel hesabı oluşturulamadı.",
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
                <ShieldCheck size={22} weight="duotone" />
              </span>
              <span>
                <SheetTitle>Yeni ekip üyesi</SheetTitle>
                <SheetDescription>
                  Yalnız görevi için gereken alanları aç; erişim istendiğinde
                  kapatılabilir.
                </SheetDescription>
              </span>
            </SheetHeader>

            <div className="service-editor-scroll">
              <section
                className="service-editor-section"
                aria-labelledby="team-access-basics-title"
              >
                <header>
                  <strong id="team-access-basics-title">
                    Hesap bilgileri
                  </strong>
                  <span>Giriş için gereken kimlik bilgileri</span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field service-field--wide">
                    <span>Görünen ad</span>
                    <Input
                      value={displayName}
                      onChange={(event) =>
                        setDisplayName(event.target.value)
                      }
                      autoFocus
                    />
                  </label>
                  <label className="service-field">
                    <span>Kullanıcı adı</span>
                    <Input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoCapitalize="none"
                      autoComplete="username"
                    />
                  </label>
                  <label className="service-field">
                    <span>Geçici parola</span>
                    <Input
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                </div>
              </section>

              <section
                className="service-editor-section"
                aria-labelledby="team-access-role-title"
              >
                <header>
                  <strong id="team-access-role-title">Yetki</strong>
                  <span>
                    Rol, panelde neyi görüp değiştirebileceğini belirler
                  </span>
                </header>
                <div className="service-editor-grid">
                  <label className="service-field service-field--wide">
                    <span>Rol</span>
                    <select
                      value={teamRole}
                      onChange={(event) => {
                        setTeamRole(event.target.value as AdminRole);
                        setProfessionalId("");
                      }}
                    >
                      <option value="RECEPTIONIST">Resepsiyon</option>
                      <option value="PROFESSIONAL">Uzman</option>
                      <option value="OWNER">Sahip</option>
                    </select>
                  </label>
                  <p className="team-access-role-hint">
                    {roleHint(teamRole)}
                  </p>
                  {teamRole === "PROFESSIONAL" && (
                    <label className="service-field service-field--wide">
                      <span>Bağlı uzman</span>
                      <select
                        value={professionalId}
                        onChange={(event) =>
                          setProfessionalId(event.target.value)
                        }
                      >
                        <option value="">Uzman seç</option>
                        {professionals.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </section>

              {error && (
                <p className="service-editor-error">
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
                  disabled={submitting || !valid}
                >
                  <ShieldCheck size={18} weight="bold" />
                  {submitting ? "Oluşturuluyor…" : "Güvenli erişim oluştur"}
                </button>
              </div>
            </footer>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
      >
        <AlertDialogContent className="service-discard-dialog">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <WarningIcon size={22} weight="duotone" />
            </AlertDialogMedia>
            <AlertDialogTitle>Değişiklikler kaybolacak</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ekip üyesi kaydı henüz oluşturulmadı.
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

function ResetPasswordDialog({
  user,
  onOpenChange,
  onDone,
  onError,
}: {
  user: AdminTeamAccess | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) setPassword("");
  }, [user]);

  const valid = password.length >= 8;

  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {user
              ? `${user.displayName} için parolayı sıfırla`
              : "Parolayı sıfırla"}
          </DialogTitle>
          <DialogDescription>
            Yeni parola kaydedildiğinde açık oturumlar hemen kapanır;
            kullanıcı yeni parolayla tekrar giriş yapmalı.
          </DialogDescription>
        </DialogHeader>
        <label className="service-field service-field--wide">
          <span>Yeni parola</span>
          <Input
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            autoFocus
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={() => {
              if (!user || !valid) return;
              setSubmitting(true);
              void resetTeamPassword(user.id, password)
                .then(() => onDone())
                .catch((reason: unknown) =>
                  onError(
                    reason instanceof Error
                      ? reason.message
                      : "Parola yenilenemedi.",
                  ),
                )
                .finally(() => setSubmitting(false));
            }}
          >
            {submitting ? "Kaydediliyor…" : "Parolayı kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function roleLabel(role: AdminRole) {
  if (role === "OWNER") return "Sahip";
  if (role === "PROFESSIONAL") return "Uzman";
  return "Resepsiyon";
}

function roleHint(role: AdminRole) {
  if (role === "OWNER") {
    return "Sahip: panelin tüm bölümlerine ve ekip yönetimine erişir, başka sahip hesabı da oluşturabilir.";
  }
  if (role === "PROFESSIONAL") {
    return "Uzman: yalnız kendi randevularını ve değerlendirmelerini görür.";
  }
  return "Resepsiyon: randevu, talep, bekleme listesi, müşteri ve çalışma düzeni akışlarını yönetir.";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}
