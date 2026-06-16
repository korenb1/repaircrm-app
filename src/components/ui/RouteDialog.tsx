"use client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  IconButton,
  useMediaQuery,
  useTheme,
  type Breakpoint,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Generic wrapper used by intercepting modal routes: renders its children
// in a centered MUI Dialog overlaid on the underlying list page. Closing
// (X, backdrop, Esc) navigates back to restore the list URL.
export default function RouteDialog({
  children,
  maxWidth = "md",
}: {
  children: React.ReactNode;
  maxWidth?: Breakpoint;
}) {
  const router = useRouter();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Restore the list URL, then revalidate it so changes made inside the modal
  // (e.g. a ticket just created via "Створити й відкрити") show on the
  // underlying page without a manual reload. Refreshing on close (rather than
  // when the modal opens) keeps the route interception intact.
  function close() {
    router.back();
    router.refresh();
  }

  return (
    <Dialog
      open
      onClose={close}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
    >
      <IconButton
        aria-label="Закрити"
        onClick={close}
        size="small"
        sx={{ position: "absolute", right: 8, top: 8, zIndex: 1 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>{children}</DialogContent>
    </Dialog>
  );
}
