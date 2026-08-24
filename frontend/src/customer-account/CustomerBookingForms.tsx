import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClipboardTextIcon } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { Button } from "../components/ui/button";
import {
  getCustomerBookingForms,
  submitCustomerBookingForm,
} from "./customerAccountApi";
import type {
  CustomerBookingForm,
} from "./customerAccountTypes";

export function CustomerBookingForms({
  publicCode,
}: {
  publicCode: string;
}) {
  const [forms, setForms] = useState<CustomerBookingForm[]>([]);
  const [answers, setAnswers] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setForms(await getCustomerBookingForms(publicCode));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Formlar yüklenemedi.",
      );
    } finally {
      setLoading(false);
    }
  }, [publicCode]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loading && !forms.length) return null;
  return (
    <section className="customer-detail-card customer-booking-forms">
      <header>
        <ClipboardTextIcon />
        <span>
          <small>Randevu hazırlığı</small>
          <h2>Ön görüşme formları</h2>
        </span>
      </header>
      {loading && (
        <p className="customer-form-loading">
          <SpinnerGapIcon className="is-spinning" /> Formlar hazırlanıyor…
        </p>
      )}
      {error && <p className="customer-form-error" role="alert">{error}</p>}
      {forms.map((form) => {
        const fields = form.formTemplateVersion.definition.fields;
        const completed = form.status !== "PENDING";
        return (
          <form
            key={form.id}
            className={completed ? "is-complete" : ""}
            onSubmit={(event) => {
              event.preventDefault();
              setBusyId(form.id);
              setError("");
              void submitCustomerBookingForm(
                publicCode,
                form.id,
                answers[form.id] ?? {},
              )
                .then(() => load())
                .catch((reason: unknown) =>
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "Form gönderilemedi.",
                  ),
                )
                .finally(() => setBusyId(""));
            }}
          >
            <div className="customer-form-title">
              <span>
                <small>
                  Sürüm {form.formTemplateVersion.version}
                  {form.isRequired ? " · Gerekli" : " · İsteğe bağlı"}
                </small>
                <h3>{form.formTemplateVersion.title}</h3>
                {form.formTemplateVersion.description && (
                  <p>{form.formTemplateVersion.description}</p>
                )}
              </span>
              {completed && (
                <b>
                  <CheckCircleIcon weight="fill" />
                  {form.status === "REVIEWED" ? "İncelendi" : "Tamamlandı"}
                </b>
              )}
            </div>
            {!completed &&
              fields.map((field) => (
                <CustomerFormField
                  key={field.key}
                  field={field}
                  value={answers[form.id]?.[field.key]}
                  onChange={(value) =>
                    setAnswers((current) => ({
                      ...current,
                      [form.id]: {
                        ...(current[form.id] ?? {}),
                        [field.key]: value,
                      },
                    }))
                  }
                />
              ))}
            {!completed && (
              <Button disabled={busyId === form.id} type="submit">
                {busyId === form.id ? (
                  <SpinnerGapIcon className="is-spinning" />
                ) : (
                  <CheckCircleIcon />
                )}
                {busyId === form.id ? "Gönderiliyor…" : "Yanıtları gönder"}
              </Button>
            )}
          </form>
        );
      })}
    </section>
  );
}

function CustomerFormField({
  field,
  value,
  onChange,
}: {
  field: CustomerBookingForm["formTemplateVersion"]["definition"]["fields"][number];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "INFORMATION") {
    return <p className="customer-form-information">{field.label}</p>;
  }
  if (field.type === "CHECKBOX") {
    return (
      <label className="customer-form-checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          required={field.required}
        />
        <span>
          {field.label}
          {field.consentType && (
            <small>
              {field.consentType === "MARKETING_CONSENT"
                ? "İsteğe bağlı pazarlama izni"
                : "İşlem ve bilgilendirme kaydı"}
            </small>
          )}
        </span>
      </label>
    );
  }
  if (field.type === "YES_NO") {
    return (
      <fieldset className="customer-form-choice">
        <legend>
          {field.label} {field.required && <b>*</b>}
        </legend>
        <label><input type="radio" name={field.key} checked={value === true} onChange={() => onChange(true)} required={field.required} /> Evet</label>
        <label><input type="radio" name={field.key} checked={value === false} onChange={() => onChange(false)} required={field.required} /> Hayır</label>
      </fieldset>
    );
  }
  if (field.type === "SINGLE_CHOICE") {
    return (
      <label>
        <span>{field.label} {field.required && <b>*</b>}</span>
        <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={field.required}>
          <option value="">Seçin</option>
          {field.options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === "MULTI_CHOICE") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <fieldset className="customer-form-choice">
        <legend>{field.label} {field.required && <b>*</b>}</legend>
        {field.options?.map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() =>
                onChange(
                  selected.includes(option)
                    ? selected.filter((item) => item !== option)
                    : [...selected, option],
                )
              }
            />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label>
      <span>{field.label} {field.required && <b>*</b>}</span>
      {field.type === "LONG_TEXT" ? (
        <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={field.required} />
      ) : (
        <input type={field.type === "DATE" ? "date" : "text"} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={field.required} />
      )}
    </label>
  );
}
