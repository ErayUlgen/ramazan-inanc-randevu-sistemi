import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/csr/Copy";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";

export function AnimatedLivingQRCode({
  value,
  code,
  statusLabel,
  compact = false,
}: {
  value: string;
  code: string;
  statusLabel: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const normalizedValue = useMemo(() => value.trim(), [value]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section
      className={`living-qr ${compact ? "living-qr--compact" : ""}`}
    >
      <div className="living-qr__stage">
        <span className="living-qr__matrix">
          <QRCodeSVG
            value={normalizedValue}
            size={compact ? 132 : 154}
            level="H"
            marginSize={1}
            bgColor="#ffffff"
            fgColor="#090f15"
            title={`Randevu ${code}`}
          />
        </span>
      </div>

      <div className="living-qr__copy">
        <span className="living-qr__live">
          <i aria-hidden="true" />
          {statusLabel}
        </span>
        <strong>{code}</strong>
        <button type="button" onClick={() => void copyCode()}>
          {copied ? (
            <CheckIcon size={16} weight="bold" />
          ) : (
            <CopyIcon size={16} weight="bold" />
          )}
          {copied ? "Kopyalandı" : "Kodu kopyala"}
        </button>
      </div>
    </section>
  );
}
