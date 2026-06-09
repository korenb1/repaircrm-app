"use client";
import { Avatar, Box, Tooltip } from "@mui/material";
import { avatarUrl } from "@/lib/avatar";
import UserAvatar from "./UserAvatar";

export interface Tech {
  id: string;
  name: string;
  avatarPath?: string | null;
}

// Overlapping avatar stack for a ticket's technicians. Hovering an avatar
// bumps it up and forward. Custom stack (not MUI AvatarGroup) so each child
// keeps its own Tooltip and hover transform reliably.
export default function TechnicianAvatars({
  techs,
  max = 3,
  size = 32,
}: {
  techs: Tech[];
  max?: number;
  size?: number;
}) {
  if (techs.length === 0) return <>—</>;
  if (techs.length === 1) {
    const t = techs[0];
    return <UserAvatar name={t.name} avatarPath={t.avatarPath} size={size} />;
  }

  const shown = techs.slice(0, max);
  const overflow = techs.slice(max);

  const bumpSx = {
    width: size,
    height: size,
    fontSize: size * 0.45,
    bgcolor: "primary.main",
    border: "2px solid #fff",
    boxSizing: "content-box" as const,
    transition: "transform .15s ease",
    "&:hover": { transform: "translateY(-5px) scale(1.12)", zIndex: 20 },
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {shown.map((t, i) => (
        <Tooltip key={t.id} title={t.name} placement="top" arrow>
          <Avatar
            src={avatarUrl(t.avatarPath)}
            sx={{ ...bumpSx, ml: i === 0 ? 0 : -1, zIndex: i }}
          >
            {t.name.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
      {overflow.length > 0 && (
        <Tooltip
          title={overflow.map((t) => t.name).join(", ")}
          placement="top"
        >
          <Avatar
            sx={{
              ...bumpSx,
              ml: -1,
              zIndex: shown.length,
              bgcolor: "grey.500",
            }}
          >
            +{overflow.length}
          </Avatar>
        </Tooltip>
      )}
    </Box>
  );
}
