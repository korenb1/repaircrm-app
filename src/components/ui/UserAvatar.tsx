"use client";
import { Avatar, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { avatarUrl } from "@/lib/avatar";

export default function UserAvatar({
  name,
  avatarPath,
  size = 32,
  sx,
}: {
  name: string;
  avatarPath?: string | null;
  size?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Tooltip title={name} placement="top" arrow>
      <Avatar
        src={avatarUrl(avatarPath)}
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          bgcolor: "primary.main",
          border: "2px solid #fff",
          boxSizing: "content-box" as const,
          ...sx,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
    </Tooltip>
  );
}
