import { BellRingingIcon } from "@phosphor-icons/react/dist/csr/BellRinging";
import { TimerIcon } from "@phosphor-icons/react/dist/csr/Timer";

export function AppointmentTimeline({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={`appointment-timeline ${compact ? "appointment-timeline--compact" : ""}`}
    >
      <div>
        <span className="appointment-timeline__marker appointment-timeline__marker--coral">
          <BellRingingIcon size={17} weight="bold" />
        </span>
        <span>
          <b>−2 saat</b>
          <small>Hatırlatma</small>
        </span>
      </div>
      <div>
        <span className="appointment-timeline__marker appointment-timeline__marker--blue">
          <TimerIcon size={17} weight="bold" />
        </span>
        <span>
          <b>−15 dk</b>
          <small>Salonda ol</small>
        </span>
      </div>
    </div>
  );
}
