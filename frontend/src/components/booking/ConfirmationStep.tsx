import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/csr/HourglassMedium";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { PhoneCallIcon } from "@phosphor-icons/react/dist/csr/PhoneCall";
import { WhatsappLogoIcon } from "@phosphor-icons/react/dist/csr/WhatsappLogo";
import { motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useState } from "react";
import { motionDurations, motionEase } from "../../design-system/motion";
import type { BookingFlow } from "../../hooks/useBookingFlow";
import type { ConfirmationValues } from "./booking.types";
import { InlineError, StepHeader } from "./BookingPrimitives";

const initialValues: ConfirmationValues = {
  fullName: "",
  phone: "",
  verificationCode: "",
  note: "",
};

export function ConfirmationStep({ flow }: { flow: BookingFlow }) {
  const reduceMotion = useReducedMotion();
  const [values, setValues] = useState(initialValues);
  const [attempted, setAttempted] = useState(false);
  const isAuthenticated = Boolean(flow.customer);
  const nameError =
    !isAuthenticated && values.fullName.trim().length < 2
      ? "Adını ve soyadını yazmalısın."
      : "";
  const phoneError =
    !isAuthenticated && values.phone.replace(/\D/g, "").length < 10
      ? "Geçerli bir cep telefonu numarası yazmalısın."
      : "";
  const codeError =
    !isAuthenticated && values.verificationCode.length !== 6
      ? "Telefonuna gönderilen 6 haneli kodu girmelisin."
      : "";
  const holdMinutes = Math.floor(flow.holdSeconds / 60)
    .toString()
    .padStart(2, "0");
  const holdRemainder = (flow.holdSeconds % 60).toString().padStart(2, "0");
  const holdExpired = flow.holdSeconds <= 0;

  const update = (field: keyof ConfirmationValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const requestCode = async () => {
    setAttempted(true);
    if (phoneError || holdExpired || flow.resendSeconds > 0) return;
    const sent = await flow.requestVerificationCode(values.phone);
    if (sent) setAttempted(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (nameError || phoneError || codeError || holdExpired) return;
    void flow.submitBooking(values);
  };

  return (
    <div className="booking-step confirmation-step">
      <StepHeader eyebrow="4 / 4" title="Bilgilerini tamamla" />

      <motion.div
        className={`hold-banner ${flow.holdSeconds < 60 ? "is-urgent" : ""}`}
        role="status"
        aria-live="polite"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionDurations.card, ease: motionEase }}
      >
        <span className="hold-banner__icon">
          <HourglassMediumIcon size={20} weight="duotone" />
        </span>
        <span>
          <strong>Saatin ayrıldı.</strong>
        </span>
        <b>
          {holdMinutes}:{holdRemainder}
        </b>
      </motion.div>

      <motion.form
        className="confirmation-form"
        onSubmit={submit}
        noValidate
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionDurations.card,
          delay: reduceMotion ? 0 : 0.06,
          ease: motionEase,
        }}
      >
        {!isAuthenticated && (
          <>
            <div className="form-field">
              <label htmlFor="fullName">Ad soyad</label>
              <input
                id="fullName"
                name="fullName"
                value={values.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                placeholder="Adın ve soyadın"
                autoComplete="name"
                aria-invalid={attempted && Boolean(nameError)}
                aria-describedby={
                  attempted && nameError ? "fullName-error" : undefined
                }
              />
              {attempted && nameError && (
                <p id="fullName-error" className="field-error" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="phone">Cep telefonu</label>
              <div className="phone-field">
                <span aria-hidden="true">+90</span>
                <input
                  id="phone"
                  name="phone"
                  value={values.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="5xx xxx xx xx"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={attempted && Boolean(phoneError)}
                  aria-describedby={
                    attempted && phoneError ? "phone-error" : undefined
                  }
                />
              </div>
              {attempted && phoneError && (
                <p id="phone-error" className="field-error" role="alert">
                  {phoneError}
                </p>
              )}
            </div>

            <div className="verification-panel form-field--wide">
              <div>
                <strong>Telefonunu doğrula</strong>
                <p>
                  Kodu gönder; hesabın ve randevun güvenle birlikte
                  oluşturulsun.
                </p>
              </div>
              <button
                type="button"
                className="ri-button ri-button--secondary verification-send"
                onClick={() => void requestCode()}
                disabled={flow.busy || flow.resendSeconds > 0 || holdExpired}
              >
                <PaperPlaneTiltIcon size={18} weight="duotone" />
                {flow.resendSeconds > 0
                  ? `Yeniden gönder (${flow.resendSeconds})`
                  : flow.verificationChallengeId
                    ? "Kodu yeniden gönder"
                    : "Kodu gönder"}
              </button>
            </div>

            {flow.verificationChallengeId && (
              <div className="form-field form-field--wide verification-code-field">
                <label htmlFor="verificationCode">SMS doğrulama kodu</label>
                <input
                  id="verificationCode"
                  name="verificationCode"
                  className="code-field"
                  value={values.verificationCode}
                  onChange={(event) =>
                    update(
                      "verificationCode",
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="••••••"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-invalid={attempted && Boolean(codeError)}
                  aria-describedby={
                    attempted && codeError ? "verification-error" : undefined
                  }
                  autoFocus
                />
                {import.meta.env.DEV && flow.developmentCode && (
                  <small className="development-note">
                    Geliştirme doğrulama kodu:{" "}
                    <strong>{flow.developmentCode}</strong>
                  </small>
                )}
                {attempted && codeError && (
                  <p
                    id="verification-error"
                    className="field-error"
                    role="alert"
                  >
                    {codeError}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="form-field form-field--wide">
          <label htmlFor="bookingNote">
            Not <span>İsteğe bağlı</span>
          </label>
          <textarea
            id="bookingNote"
            name="note"
            value={values.note}
            onChange={(event) => update("note", event.target.value)}
            placeholder="Saçın, stil beklentin veya hassasiyetlerin…"
            rows={3}
          />
        </div>

        <div className="form-field--wide">
          <InlineError
            message={
              holdExpired
                ? "Ayırdığımız sürenin sonuna geldik. Lütfen saati yeniden seç."
                : flow.error
            }
          />
          {flow.onlineBookingRestricted && (
            <div className="booking-restriction-contact" role="status">
              <div>
                <strong>
                  Online randevu hesabın için salon desteği gerekiyor.
                </strong>
                <p>
                  Ekibimiz hesabını kontrol edip uygun randevu seçeneğini
                  birlikte oluşturabilir.
                </p>
              </div>
              <span className="booking-restriction-contact__actions">
                <a
                  className="ri-button ri-button--secondary"
                  href={`tel:${flow.salonPhone.replace(/[^\d+]/g, "")}`}
                >
                  <PhoneCallIcon size={18} weight="duotone" />
                  Salonu ara
                </a>
                {flow.whatsappPhone && (
                  <a
                    className="ri-button ri-button--secondary"
                    href={`https://wa.me/${flow.whatsappPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WhatsappLogoIcon size={18} weight="duotone" />
                    WhatsApp’tan yaz
                  </a>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="confirmation-actions form-field--wide">
          <motion.button
            type="button"
            className="ri-button ri-button--secondary"
            onClick={() => flow.goToStep(3)}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <ArrowLeftIcon size={18} weight="bold" /> Geri
          </motion.button>
          <motion.button
            type="submit"
            className="ri-button ri-button--primary"
            disabled={
              flow.busy ||
              flow.sessionChecking ||
              holdExpired ||
              (!isAuthenticated && !flow.verificationChallengeId)
            }
            whileTap={
              reduceMotion || flow.busy || holdExpired
                ? undefined
                : { scale: 0.98 }
            }
          >
            {flow.busy ? "Gönderiliyor…" : "Randevu talebini gönder"}
            <ArrowRightIcon size={18} weight="bold" />
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}
