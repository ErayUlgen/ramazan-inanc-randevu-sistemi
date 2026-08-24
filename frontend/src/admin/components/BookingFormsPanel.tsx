import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClipboardTextIcon } from "@phosphor-icons/react/dist/csr/ClipboardText";
import {
  getAdminBookingForms,
  reviewAdminBookingForm,
} from "../api/adminApi";
import type { AdminBookingFormSubmission } from "../sprint12.types";

export function BookingFormsPanel({ bookingId }: { bookingId: string }) {
  const [items, setItems] = useState<AdminBookingFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getAdminBookingForms(bookingId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Formlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!loading && !items.length) return null;
  return (
    <section className="drawer-section drawer-booking-forms">
      <h3><ClipboardTextIcon /> Ön görüşme formları</h3>
      {loading && <p>Formlar yükleniyor…</p>}
      {error && <p className="admin-form-error" role="alert">{error}</p>}
      {items.map((item) => (
        <article key={item.id}>
          <header>
            <span>
              <small>Sürüm {item.formTemplateVersion.version}</small>
              <strong>{item.formTemplateVersion.title}</strong>
            </span>
            <b className={`is-${item.status.toLowerCase()}`}>
              {item.status === "PENDING"
                ? "Form bekleniyor"
                : item.status === "REVIEWED"
                  ? "İncelendi"
                  : "Tamamlandı"}
            </b>
          </header>
          {item.answers && (
            <dl>
              {item.formTemplateVersion.definition.fields
                .filter((field) => field.type !== "INFORMATION")
                .map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>{answerLabel(item.answers?.[field.key])}</dd>
                  </div>
                ))}
            </dl>
          )}
          {item.status === "SUBMITTED" && (
            <button
              type="button"
              className="admin-quiet-button"
              onClick={() =>
                void reviewAdminBookingForm(item.id).then(() => load())
              }
            >
              <CheckCircleIcon /> İncelendi olarak işaretle
            </button>
          )}
        </article>
      ))}
    </section>
  );
}

function answerLabel(value: unknown) {
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}
