import type { CSSProperties } from "react";

const palettes = [
  ["#293642", "#090F15"],
  ["#0E9A78", "#065D49"],
  ["#D2B176", "#8A6A37"],
] as const;

const professionalPalette = (name: string) => ({
  colors: palettes[hashName(name) % palettes.length],
  ink: "#FFFFFF",
});

const hashName = (name: string) => {
  let hash = 0;
  for (const character of name)
    hash = character.charCodeAt(0) + ((hash << 5) - hash);
  return Math.abs(hash);
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "?"}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toLocaleUpperCase(
    "tr-TR",
  );
};

export function ProfessionalAvatar({
  name,
  src,
  size = "md",
  selected = false,
  disabled = false,
}: {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  disabled?: boolean;
}) {
  const palette = professionalPalette(name);
  const style = {
    "--avatar-from": palette.colors[0],
    "--avatar-to": palette.colors[1],
    "--avatar-ink": palette.ink,
  } as CSSProperties;

  return (
    <span
      className={`professional-avatar professional-avatar--${size} ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
      style={style}
      title={name}
    >
      <span className="professional-avatar__surface">
        {src ? (
          <img src={src} alt={name} />
        ) : (
          <span aria-hidden="true">{initials(name)}</span>
        )}
      </span>
    </span>
  );
}
