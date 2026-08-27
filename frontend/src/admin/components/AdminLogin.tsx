import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { LockKeyIcon } from "@phosphor-icons/react/dist/csr/LockKey";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { motionDurations, motionEase } from "../../design-system/motion";
import { StudioWordmark } from "../../components/brand/StudioWordmark";

type Props = {
  error: string | null;
  submitting: boolean;
  lockedUntil: number | null;
  onLogin: (credentials: {
    username: string;
    password: string;
  }) => Promise<void>;
};

export function AdminLogin({ error, submitting, lockedUntil, onLogin }: Props) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const [remainingMs, setRemainingMs] = useState(() =>
    lockedUntil ? Math.max(0, lockedUntil - Date.now()) : 0,
  );

  useEffect(() => {
    if (!lockedUntil) {
      setRemainingMs(0);
      return;
    }
    const tick = () => setRemainingMs(Math.max(0, lockedUntil - Date.now()));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  const locked = remainingMs > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password || submitting || locked) return;
    void onLogin({ username: username.trim(), password });
  };

  return (
    <main className="admin-login">
      <motion.section
        className="admin-login__card"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDurations.page, ease: motionEase }}
        aria-labelledby="admin-login-title"
      >
        <div className="admin-login__brandpane">
          {/* aria-label bilinçli olarak yok: erişilebilir ad görünen metinden
              gelir (bkz. BrandHeader.tsx — sabit aria-label, marka adının CSS
              ile büyük harfe çevrilmesiyle "HAİR" / "Hair" Türkçe nokta'lı İ
              yüzünden ayrışıyordu). */}
          <a className="admin-login__brand" href="/">
            <StudioWordmark />
          </a>
          <div className="admin-login__intro">
            <span className="admin-kicker">
              <LockKeyIcon size={18} weight="duotone" /> Yönetici erişimi
            </span>
            <h1 id="admin-login-title">Randevu merkezine giriş</h1>
            <p>Günün akışını ve onay bekleyen talepleri tek ekrandan yönetin.</p>
          </div>
          <p className="admin-login__stamp">Salon kontrol merkezi</p>
        </div>
        <form className="admin-login__form" onSubmit={submit} noValidate>
          <div className="admin-login__field">
            <Label htmlFor="admin-username">Kullanıcı adı</Label>
            <Input
              id="admin-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              disabled={locked}
              aria-invalid={Boolean(error)}
            />
          </div>
          <div className="admin-login__field">
            <Label htmlFor="admin-access-key">Parola</Label>
            <div className="admin-secret-field">
              <Input
                id="admin-access-key"
                type={visible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={locked}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  locked
                    ? "admin-login-lock"
                    : error
                      ? "admin-login-error"
                      : undefined
                }
              />
              <button
                type="button"
                className="admin-secret-field__toggle"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? "Anahtarı gizle" : "Anahtarı göster"}
                disabled={locked}
              >
                {visible ? (
                  <EyeSlashIcon size={19} />
                ) : (
                  <EyeIcon size={19} />
                )}
              </button>
            </div>
          </div>

          {locked ? (
            <p
              id="admin-login-lock"
              className="admin-login__lockout"
              role="alert"
            >
              <LockKeyIcon size={18} weight="duotone" aria-hidden="true" />
              <span>
                <strong>Çok fazla başarısız deneme</strong>
                <small>
                  {formatCountdown(remainingMs)} sonra tekrar deneyebilirsin.
                </small>
              </span>
            </p>
          ) : (
            error && (
              <p
                id="admin-login-error"
                className="admin-login__error"
                role="alert"
              >
                <WarningIcon size={16} weight="fill" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )
          )}

          <button
            className="admin-primary-button admin-login__submit"
            type="submit"
            disabled={!username.trim() || !password || submitting || locked}
          >
            {submitting ? (
              <>
                <span className="admin-spinner" /> Giriş yapılıyor
              </>
            ) : locked ? (
              "Erişim kilitli"
            ) : (
              "Randevu merkezini aç"
            )}
          </button>
        </form>
        <a className="admin-login__back" href="/">
          Müşteri randevu sayfasına dön
        </a>
      </motion.section>
    </main>
  );
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
