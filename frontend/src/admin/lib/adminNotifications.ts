export type AdminNotificationPreferences = {
  soundEnabled: boolean;
  desktopEnabled: boolean;
};

const STORAGE_KEY = "ri_admin_notification_preferences";

export function readAdminNotificationPreferences(): AdminNotificationPreferences {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as Partial<AdminNotificationPreferences>;
    return {
      soundEnabled: saved.soundEnabled ?? true,
      desktopEnabled: saved.desktopEnabled ?? false,
    };
  } catch {
    return { soundEnabled: true, desktopEnabled: false };
  }
}

export function saveAdminNotificationPreferences(
  preferences: AdminNotificationPreferences,
) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent("ri-admin-notification-settings"));
}

export async function playAdminAlert() {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  if (context.state === "suspended") await context.resume();
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.62);
  master.connect(context.destination);
  [659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.72 : 0.42;
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(context.currentTime + index * 0.09);
    oscillator.stop(context.currentTime + 0.55 + index * 0.09);
  });
  window.setTimeout(() => void context.close(), 900);
}

export function showDesktopBookingNotification(input: {
  bookingId: string;
  time: string;
  service: string;
  customerName?: string | null;
}) {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  const notification = new Notification("Yeni randevu talebi", {
    body: `${input.time} · ${input.service}${input.customerName ? ` · ${input.customerName}` : ""}`,
    tag: `booking-${input.bookingId}`,
  });
  notification.onclick = () => {
    window.focus();
    const url = new URL(window.location.href);
    url.pathname = "/admin";
    url.searchParams.set("booking", input.bookingId);
    window.location.assign(url);
  };
}
