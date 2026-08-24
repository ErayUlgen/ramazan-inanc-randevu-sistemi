import { KeyIcon as KeyRound } from "@phosphor-icons/react/dist/csr/Key";
import { SignOutIcon as LogOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { UserGearIcon as UserRoundCog } from "@phosphor-icons/react/dist/csr/UserGear";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
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

const EMPTY_FORM = {
  username: "",
  displayName: "",
  password: "",
  role: "RECEPTIONIST" as AdminRole,
  professionalId: "",
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createTeamAccess({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        role: form.role,
        professionalId:
          form.role === "PROFESSIONAL" ? form.professionalId : null,
      });
      setForm(EMPTY_FORM);
      toast.success("Personel erişimi oluşturuldu.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Personel hesabı oluşturulamadı.",
      );
    } finally {
      setSaving(false);
    }
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
    >
      {error && (
        <AdminErrorBanner
          title="Ekip erişimi güncellenemedi"
          error={error}
          fallback="İşlem şu anda tamamlanamadı."
          onRetry={() => void load()}
        />
      )}
      <div className="team-access-layout">
        <form className="team-access-form" onSubmit={create}>
          <header>
            <span>
              <Plus />
            </span>
            <div>
              <small>Yeni erişim</small>
              <h2>Personel hesabı oluştur</h2>
            </div>
          </header>
          <label>
            Görünen ad
            <input
              required
              value={form.displayName}
              onChange={(event) =>
                setForm({ ...form, displayName: event.target.value })
              }
            />
          </label>
          <label>
            Kullanıcı adı
            <input
              required
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
              autoCapitalize="none"
            />
          </label>
          <label>
            Geçici parola
            <input
              required
              minLength={10}
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </label>
          <label>
            Rol
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as AdminRole })
              }
            >
              <option value="RECEPTIONIST">Resepsiyon</option>
              <option value="PROFESSIONAL">Uzman</option>
              <option value="OWNER">Sahip</option>
            </select>
          </label>
          {form.role === "PROFESSIONAL" && (
            <label>
              Bağlı uzman
              <select
                required
                value={form.professionalId}
                onChange={(event) =>
                  setForm({ ...form, professionalId: event.target.value })
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
          <Button disabled={saving} type="submit">
            <ShieldCheck />
            {saving ? "Oluşturuluyor…" : "Güvenli erişim oluştur"}
          </Button>
        </form>
        <section className="team-access-list">
          <header>
            <span>
              <UserRoundCog />
            </span>
            <div>
              <small>Aktif yetkiler</small>
              <h2>Salon ekibi</h2>
            </div>
          </header>
          {loading ? (
            <div className="operation-card--skeleton team-access-skeleton" />
          ) : (
            users.map((user) => (
              <article key={user.id}>
                <span className="team-access-avatar">
                  {initials(user.displayName)}
                </span>
                <div className="team-access-identity">
                  <strong>{user.displayName}</strong>
                  <small>
                    @{user.username} · {roleLabel(user.role)}
                  </small>
                  {user.professional && (
                    <small>{user.professional.name} kaydına bağlı</small>
                  )}
                </div>
                <div className="team-access-state">
                  <b className={user.isActive ? "is-active" : ""}>
                    {user.isActive ? "Aktif" : "Kapalı"}
                  </b>
                  <small>{user.activeSessionCount} açık oturum</small>
                </div>
                <div className="team-access-actions">
                  <Button
                    variant="outline"
                    size="icon"
                    title="Parolayı sıfırla"
                    onClick={() => {
                      const password = window.prompt(
                        `${user.displayName} için en az 10 karakterli yeni parola`,
                      );
                      if (!password) return;
                      void resetTeamPassword(user.id, password)
                        .then(() =>
                          toast.success(
                            "Parola yenilendi, açık oturumlar kapatıldı.",
                          ),
                        )
                        .catch((reason: unknown) =>
                          setError(
                            reason instanceof Error
                              ? reason.message
                              : "Parola yenilenemedi.",
                          ),
                        );
                    }}
                  >
                    <KeyRound />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Tüm oturumları kapat"
                    disabled={!user.activeSessionCount}
                    onClick={() =>
                      void revokeTeamSessions(user.id)
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
                    }
                  >
                    <LogOut />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      void updateTeamAccess(user.id, {
                        isActive: !user.isActive,
                      })
                        .then(() => void load())
                        .catch((reason: unknown) =>
                          setError(
                            reason instanceof Error
                              ? reason.message
                              : "Hesap durumu değiştirilemedi.",
                          ),
                        )
                    }
                  >
                    {user.isActive ? "Erişimi kapat" : "Erişimi aç"}
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </AdminPageFrame>
  );
}

function roleLabel(role: AdminRole) {
  if (role === "OWNER") return "Sahip";
  if (role === "PROFESSIONAL") return "Uzman";
  return "Resepsiyon";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}
