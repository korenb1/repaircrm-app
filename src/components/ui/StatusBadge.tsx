"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Menu, MenuItem } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { createClient } from "@/lib/supabase/client";
import { useStatusMeta, useAllowedTargets, useStatuses } from "@/lib/status-context";
import { isTerminalGroup } from "@/lib/constants";
import IssueTicketDialog from "@/components/tickets/IssueTicketDialog";

export default function StatusBadge({
  ticketId,
  status,
}: {
  ticketId: number;
  status: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { byKey } = useStatuses();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [current, setCurrent] = useState<string>(status);
  // The terminal status the user is moving into (drives the close dialog), or
  // null when no close dialog is open.
  const [closing, setClosing] = useState<string | null>(null);

  // The virtualized table recycles row components, so a reused StatusBadge must
  // resync to the new row's status prop — otherwise it keeps showing the
  // previously-rendered ticket's status (e.g. "Нове" on every recycled row).
  useEffect(() => setCurrent(status), [status]);
  const [saving, setSaving] = useState(false);

  const meta = useStatusMeta(current);
  const targets = useAllowedTargets(current);

  async function change(next: string) {
    setAnchor(null);
    if (next === current) return;
    // Closing a ticket (moving into a terminal group) books a payment or refund
    // first — defer the status write to the close dialog.
    if (isTerminalGroup(byKey.get(next)?.group)) {
      setClosing(next);
      return;
    }
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
        {targets.map((s) => (
          <MenuItem
            key={s.key}
            selected={s.key === current}
            onClick={(e) => {
              e.stopPropagation();
              change(s.key);
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 2,
                marginRight: 8,
                background: s.bg,
                border: "1px solid rgba(0,0,0,0.15)",
              }}
            />
            {s.label}
          </MenuItem>
        ))}
      </Menu>
      {closing && (
        <IssueTicketDialog
          ticketId={ticketId}
          targetStatus={closing}
          mode={byKey.get(closing)?.group === "closed_fail" ? "refund" : "pay"}
          onCancel={() => setClosing(null)}
          onIssued={() => {
            setCurrent(closing);
            setClosing(null);
          }}
        />
      )}
    </>
  );
}
