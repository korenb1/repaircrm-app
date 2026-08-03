"use client";
import { useMemo, useState } from "react";
import { Box, Link as MuiLink, Stack, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlaylistRemoveIcon from "@mui/icons-material/PlaylistRemove";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import CommentIcon from "@mui/icons-material/CommentOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFileOutlined";
import ImageIcon from "@mui/icons-material/ImageOutlined";
import { createClient } from "@/lib/supabase/client";
import { useT, useMoney } from "@/lib/i18n/context";
import { fmt as interpolate } from "@/lib/i18n";
import { useStatuses } from "@/lib/status-context";
import TimelineComposer from "@/components/tickets/tabs/TimelineComposer";
import ImageLightbox, { type LightboxImage } from "@/components/ui/ImageLightbox";
import type { TicketEventKind, TicketEventRow } from "@/lib/types";

const BUCKET = "ticket-files";
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i;

// Must match TicketCard's HEADER_H / FOOTER_H so the timeline's header and
// composer dividers line up with the left column's tab and footer dividers.
const HEADER_H = 52;
const FOOTER_H = 69;

const ICONS: Record<TicketEventKind, { Icon: typeof AddCircleOutlineIcon; color: string }> = {
  created: { Icon: AddCircleOutlineIcon, color: "#0288d1" },
  status_changed: { Icon: SwapHorizIcon, color: "#7b1fa2" },
  item_added: { Icon: PlaylistAddIcon, color: "#2e7d32" },
  item_removed: { Icon: PlaylistRemoveIcon, color: "#c62828" },
  invoice_added: { Icon: ReceiptLongIcon, color: "#ed6c02" },
  payment_added: { Icon: PaymentsIcon, color: "#2e7d32" },
  comment: { Icon: CommentIcon, color: "#455a64" },
  attachment: { Icon: AttachFileIcon, color: "#1565c0" },
};

interface AttachmentMeta {
  path?: string;
  name?: string;
  size?: number;
  mime?: string;
}

// Whatever the trigger functions put in ticket_events.meta.
interface EventMeta {
  from?: string;
  to?: string;
  name?: string;
  qty?: number;
  amount?: number;
  kind?: string;
}

function isImage(meta: AttachmentMeta) {
  if (meta.mime) return meta.mime.startsWith("image/");
  return IMAGE_EXT.test(meta.name ?? "");
}

function fmtWhen(iso: string) {
  // dd.mm.yyyy hh:mm
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Trigger-logged events carry only structured `meta` — the sentence is built
// here so it follows the UI locale, the user-editable status labels, and the
// configured currency. comment/attachment rows are user text and pass through.
//
// Rows logged by an older build of the triggers still hold a prose `summary`,
// but their `meta` has the same fields, so they render through this path too;
// `summary` is the fallback only when meta is short.
function useEventText() {
  const T = useT();
  const money = useMoney();
  const { byKey } = useStatuses();

  return (e: TicketEventRow): string => {
    const E = T.ticket.timeline.events;
    const m = (e.meta ?? {}) as EventMeta;
    const status = (key: string) => byKey.get(key)?.label ?? key;

    switch (e.kind) {
      case "created":
        return E.created;
      case "status_changed":
        return m.to
          ? interpolate(E.statusChanged, { from: status(m.from ?? ""), to: status(m.to) })
          : e.summary;
      case "item_added":
        return m.name
          ? interpolate(E.itemAdded, { name: m.name, qty: m.qty ?? 1 })
          : e.summary;
      case "item_removed":
        return m.name ? interpolate(E.itemRemoved, { name: m.name }) : e.summary;
      case "invoice_added":
        return m.amount != null
          ? interpolate(E.invoiceAdded, { amount: money(Number(m.amount)) })
          : e.summary;
      case "payment_added": {
        const kinds = T.finances.txKinds as Record<string, string | undefined>;
        return m.amount != null
          ? interpolate(E.paymentAdded, {
              kind: (m.kind && kinds[m.kind]) || m.kind || "",
              amount: money(Number(m.amount)),
            })
          : e.summary;
      }
      default:
        return e.summary;
    }
  };
}

// Always-visible activity panel on the right of the ticket card: header, a
// scrollable feed (oldest first), then a pinned comment/file composer at the
// bottom. Designed to fill its parent's height (parent controls the box height).
export default function TicketTimeline({
  ticketId,
  events,
}: {
  ticketId: number;
  events: TicketEventRow[];
}) {
  const T = useT();
  const eventText = useEventText();
  const supabase = createClient();
  const [lightbox, setLightbox] = useState<number | null>(null);

  function formatSize(bytes: number) {
    if (!bytes) return "";
    const units = [T.common.unitB, T.common.unitKB, T.common.unitMB, T.common.unitGB];
    let n = bytes;
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { images, imageIndexByEvent } = useMemo(() => {
    const imgs: LightboxImage[] = [];
    const byEvent = new Map<number, number>();
    for (const e of events) {
      if (e.kind !== "attachment") continue;
      const meta = e.meta as AttachmentMeta;
      if (!meta.path || !isImage(meta)) continue;
      byEvent.set(e.id, imgs.length);
      imgs.push({ url: publicUrl(meta.path), name: meta.name ?? e.summary });
    }
    return { images: imgs, imageIndexByEvent: byEvent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  return (
    <Box sx={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Box
        sx={{
          px: 2,
          minHeight: HEADER_H,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {T.ticket.tabs.history}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, p: 2 }}>
        {events.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {T.ticket.timeline.noEvents}
          </Typography>
        ) : (
          <Stack spacing={0}>
            {events.map((e, i) => {
              const { Icon, color } = ICONS[e.kind] ?? ICONS.created;
              const last = i === events.length - 1;
              const meta = e.meta as AttachmentMeta;
              const imgIdx = imageIndexByEvent.get(e.id);
              const isImg = e.kind === "attachment" && imgIdx !== undefined;
              return (
                <Stack key={e.id} direction="row" spacing={1.5} sx={{ alignItems: "stretch" }}>
                  <Stack sx={{ alignItems: "center", width: 32 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: `${color}1a`,
                        color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isImg ? <ImageIcon sx={{ fontSize: 18 }} /> : <Icon sx={{ fontSize: 18 }} />}
                    </Box>
                    {!last && <Box sx={{ flexGrow: 1, width: "2px", bgcolor: "#eee", my: 0.5 }} />}
                  </Stack>
                  <Box sx={{ pb: last ? 0 : 2, pt: 0.5, minWidth: 0 }}>
                    {e.kind === "comment" ? (
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {e.summary}
                      </Typography>
                    ) : isImg && meta.path ? (
                      <Box
                        component="img"
                        src={images[imgIdx!].url}
                        alt={meta.name ?? e.summary}
                        onClick={() => setLightbox(imgIdx!)}
                        sx={{
                          display: "block",
                          width: 120,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 1,
                          border: "1px solid #e0e0e0",
                          cursor: "pointer",
                          transition: "filter 120ms",
                          "&:hover": { filter: "brightness(0.92)" },
                        }}
                      />
                    ) : e.kind === "attachment" && meta.path ? (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        <MuiLink href={publicUrl(meta.path)} target="_blank" rel="noopener" underline="hover">
                          {meta.name ?? e.summary}
                        </MuiLink>
                        {meta.size ? (
                          <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                            {formatSize(meta.size)}
                          </Typography>
                        ) : null}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {eventText(e)}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: isImg ? 0.5 : 0 }}>
                      {fmtWhen(e.created_at)}
                      {e.actor?.full_name ? ` · ${e.actor.full_name}` : ""}
                    </Typography>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          px: 1.5,
          minHeight: FOOTER_H,
          display: "flex",
          alignItems: "center",
          borderTop: "1px solid #eee",
          flexShrink: 0,
        }}
      >
        <TimelineComposer ticketId={ticketId} />
      </Box>

      <ImageLightbox
        images={images}
        index={lightbox}
        onIndexChange={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </Box>
  );
}
