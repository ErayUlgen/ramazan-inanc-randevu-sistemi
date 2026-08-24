import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { LockKeyIcon } from "@phosphor-icons/react/dist/csr/LockKey";
import { motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useState } from "react";
import { motionDurations, motionEase } from "../../design-system/motion";
import { StudioWordmark } from "../../components/brand/StudioWordmark";

type Props = {
  error: string | null;
  submitting: boolean;
  onLogin: (credentials: {
    username: string;
    password: string;
  }) => Promise<void>;
};

export function AdminLogin({ error, submitting, onLogin }: Props) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password || submitting) return;
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
        <a
          className="admin-login__brand"
          href="/"
          aria-label="Randevu sayfasına dön"
        >
          <StudioWordmark />
        </a>
        <div className="admin-login__intro">
          <span className="admin-kicker">
            <LockKeyIcon size={18} weight="duotone" /> Yönetici erişimi
          </span>
          <h1 id="admin-login-title">Randevu merkezine giriş</h1>
          <p>Günün akışını ve onay bekleyen talepleri tek ekrandan yönetin.</p>
        </div>
        <form onSubmit={submit} noValidate>
          <label htmlFor="admin-username">Kullanıcı adı</label>
          <input
            id="admin-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            aria-invalid={Boolean(error)}
          />
          <label htmlFor="admin-access-key">Parola</label>
          <div className="admin-secret-field">
            <input
              id="admin-access-key"
              type={visible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-login-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? "Anahtarı gizle" : "Anahtarı göster"}
            >
              {visible ? <EyeSlashIcon size={21} /> : <EyeIcon size={21} />}
            </button>
          </div>
          {error && (
            <p id="admin-login-error" className="admin-form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="admin-primary-button admin-login__submit"
            type="submit"
            disabled={!username.trim() || !password || submitting}
          >
            {submitting ? (
              <>
                <span className="admin-spinner" /> Giriş yapılıyor
              </>
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
