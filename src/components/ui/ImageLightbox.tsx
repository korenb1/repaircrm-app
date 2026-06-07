"use client";
import { useCallback, useEffect, useRef } from "react";
import {
  Box,
  Dialog,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export interface LightboxImage {
  url: string;
  name: string;
}

// Full-screen-ish image viewer overlaid like the route modals. Navigate with
// the on-screen arrows, ←/→ keys, or horizontal swipe; Esc / backdrop / X close.
export default function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const touchX = useRef<number | null>(null);

  const open = index !== null;
  const count = images.length;
  const current = open ? images[index!] : null;

  const go = useCallback(
    (delta: number) => {
      if (index === null || count === 0) return;
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!current) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      slotProps={{ paper: { sx: { bgcolor: "rgba(0,0,0,0.92)", boxShadow: "none" } } }}
    >
      <IconButton
        aria-label="Закрити"
        onClick={onClose}
        sx={{ position: "absolute", right: 8, top: 8, zIndex: 2, color: "#fff" }}
      >
        <CloseIcon />
      </IconButton>

      <Box
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: { xs: "70vh", sm: "75vh" },
          p: { xs: 1, sm: 3 },
        }}
      >
        {count > 1 && (
          <IconButton
            aria-label="Попереднє"
            onClick={() => go(-1)}
            sx={{
              position: "absolute",
              left: 8,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}

        <Box
          component="img"
          src={current.url}
          alt={current.name}
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "70vh", sm: "75vh" },
            objectFit: "contain",
            borderRadius: 1,
          }}
        />

        {count > 1 && (
          <IconButton
            aria-label="Наступне"
            onClick={() => go(1)}
            sx={{
              position: "absolute",
              right: 8,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ textAlign: "center", pb: 1.5, color: "rgba(255,255,255,0.85)" }}>
        <Typography variant="body2" noWrap sx={{ px: 6 }}>
          {current.name}
        </Typography>
        {count > 1 && (
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
            {index! + 1} / {count}
          </Typography>
        )}
      </Box>
    </Dialog>
  );
}
