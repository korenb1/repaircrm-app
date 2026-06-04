"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Menu, MenuItem } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, STATUS_ORDER } from "@/lib/constants";
import type { TicketStatus } from "@/lib/types";

export default function StatusBadge({
  ticketId,
  status,
}: {
  ticketId: number;
  status: TicketStatus;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [current, setCurrent] = useState<TicketStatus>(status);
  const [saving, setSaving] = useState(false);

  const meta = STATUSES[current];

  async function change(next: TicketStatus) {
    setAnchor(null);
    if (next === current) return;
    setSaving(true);
    const prev = current;
    setCurrent(next);
    const { error } = await supabase
      .from("tickets")
      .update({ status: next })
      .eq("id", ticketId);
    setSaving(false);
    if (error) {
      setCurrent(prev);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Button
        size="small"
        variant="contained"
        disableElevation
        disabled={saving}
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
        sx={{
          bgcolor: meta.bg,
          color: meta.color,
          textTransform: "none",
          fontWeight: 600,
          fontSize: 12,
          lineHeight: 1.2,
          whiteSpace: "normal",
          textAlign: "left",
          "&:hover": { bgcolor: meta.bg, filter: "brightness(0.96)" },
        }}
      >
        {meta.label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {STATUS_ORDER.map((s) => (
          <MenuItem
            key={s}
            selected={s === current}
            onClick={(e) => {
              e.stopPropagation();
              change(s);
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 2,
                marginRight: 8,
                background: STATUSES[s].bg,
                border: "1px solid rgba(0,0,0,0.15)",
              }}
            />
            {STATUSES[s].label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
