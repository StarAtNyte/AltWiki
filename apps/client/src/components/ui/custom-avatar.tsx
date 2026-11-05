import React from "react";
import { Avatar } from "@mantine/core";
import { getAvatarUrl } from "@/lib/config.ts";
import { AvatarIconType } from "@/features/attachments/types/attachment.types.ts";
import { SpaceAvatar } from "@/components/ui/space-avatar.tsx";

interface CustomAvatarProps {
  avatarUrl: string;
  name: string;
  color?: string;
  size?: string | number;
  radius?: string | number;
  variant?: string;
  style?: any;
  component?: any;
  type?: AvatarIconType;
  mt?: string | number;
}

export const CustomAvatar = React.forwardRef<
  HTMLInputElement,
  CustomAvatarProps
>(({ avatarUrl, name, type, ...props }: CustomAvatarProps, ref) => {
  // Spaces use the curated deterministic palette instead of random initials colours.
  if (type === AvatarIconType.SPACE_ICON) {
    const { color, variant, ...rest } = props;
    return (
      <SpaceAvatar
        ref={ref as any}
        name={name}
        logo={avatarUrl}
        {...rest}
      />
    );
  }

  const avatarLink = getAvatarUrl(avatarUrl, type);

  return (
    <Avatar
      ref={ref}
      src={avatarLink}
      name={name}
      alt={name}
      color="initials"
      {...props}
    />
  );
});
