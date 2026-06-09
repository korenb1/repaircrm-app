"use client";
import { Avatar, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { avatarUrl } from "@/lib/avatar";

export default function UserAvatar({
  name,
  avatarPath,
  size = 36,
  sx,
}: {
  name: string;
  avatarPath?: string | null;
  size?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Tooltip title={name} placement="top">
      <Avatar
        src={avatarUrl(avatarPath)}
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          bgcolor: "primary.main",
          ...sx,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
    </Tooltip>
  );
}
