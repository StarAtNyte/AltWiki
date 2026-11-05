import React from "react";
import { Avatar, AvatarProps } from "@mantine/core";
import { getAvatarUrl } from "@/lib/config.ts";
import { AvatarIconType } from "@/features/attachments/types/attachment.types.ts";
import { getSpaceColor, getSpaceInitials } from "@/lib/space-color.ts";

export interface SpaceAvatarProps extends Omit<AvatarProps, "src" | "name"> {
  /** Space name (drives initials, and colour when no id is given). */
  name?: string | null;
  /** Optional override for the colour key (defaults to the name). */
  colorKey?: string | null;
  /** Space logo (attachment path or absolute URL). */
  logo?: string | null;
  style?: React.CSSProperties;
  component?: any;
}

/**
 * Space logo, or coloured initials on a deterministic, muted solid colour from the
 * curated space palette (see lib/space-color.ts).
 */
export const SpaceAvatar = React.forwardRef<HTMLDivElement, SpaceAvatarProps>(
  ({ name, colorKey, logo, radius, size = 20, styles, ...props }, ref) => {
    const src = getAvatarUrl(logo || undefined, AvatarIconType.SPACE_ICON);
    const color = getSpaceColor(colorKey || name || "");
    // Same rounded square for logo and initials: 8px at 32px, scaled with size.
    const resolvedRadius =
      radius ?? (typeof size === "number" ? Math.round(size * 0.25) : "sm");
    return (
      <Avatar
        ref={ref}
        src={src}
        alt={name || ""}
        radius={resolvedRadius}
        size={size}
        variant="filled"
        styles={{
          image: { objectFit: "cover" },
          placeholder: {
            background: color.base,
            color: "#fff",
            fontWeight: 600,
            letterSpacing: "0.02em",
            fontSize: `calc(var(--avatar-size) * 0.4)`,
          },
          ...(styles as any),
        }}
        {...props}
      >
        {getSpaceInitials(name)}
      </Avatar>
    );
  },
);
