import type { CSSProperties } from "react";

const palettes = [
  ["#2B333D", "#0E141B"],
  ["#32C9A0", "#13755F"],
  ["#A96AE8", "#6B35A8"],
  ["#E6A91D", "#A66700"],
  ["#F06C83", "#B43D59"],
  ["#7068DB", "#433A9A"],
  ["#24A69B", "#19726B"],
  ["#D2B176", "#8A6A37"],
] as const;

const professionalPalette = (name: string) => {
  const normalized = name
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.startsWith("hikmet cetin")) {
    return {
      colors: ["#6EA1FF", "#2457C5"] as const,
      ink: "#FFFFFF",
    };
  }

  return {
    colors: palettes[hashName(name) % palettes.length],
    ink: "#FFFFFF",
  };
};

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
