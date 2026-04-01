import { getAvatarUrl, isAvatarSeed, getAvatarColor } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface PlayerAvatarProps {
  /** DiceBear seed string (new) or legacy emoji char */
  value: string;
  /** Player ID — used for background colour when falling back to initials */
  playerId?: string;
  /** Display name — used when falling back to initials */
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-5 h-5 text-xs",
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl",
};

export function PlayerAvatar({
  value,
  playerId = "",
  name = "",
  size = "md",
  className = "",
}: PlayerAvatarProps) {
  const base = `rounded-full flex items-center justify-center shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`;

  if (value && isAvatarSeed(value)) {
    return (
      <img
        src={getAvatarUrl(value)}
        alt={name || value}
        className={`${base} object-cover`}
        aria-hidden
      />
    );
  }

  if (value) {
    // Legacy emoji
    return (
      <span className={`${base} bg-white`} aria-hidden>
        {value}
      </span>
    );
  }

  // Fallback: coloured circle with initial
  return (
    <span
      className={`${base} ${getAvatarColor(playerId)} text-white font-bold`}
      aria-hidden
    >
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
