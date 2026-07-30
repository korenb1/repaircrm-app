"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NumberField from "@/components/NumberField";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import FlagIcon from "@mui/icons-material/Flag";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { STATUS_GROUPS, STATUS_GROUP_BY_KEY, isTerminalGroup } from "@/lib/constants";
import { useT } from "@/lib/i18n/context";
import type { TicketStatusRow, StatusTransition } from "@/lib/types";

// A ticket in `fromGroup` may transition to `toGroup` unless:
//  - the target is in the `new` group and the source is not (nothing re-enters
//    the "new" group from later in the workflow), or
//  - the source is a terminal (closed) group, which has no outgoing edges.
function transitionAllowed(fromGroup: string, toGroup: string): boolean {
  if (isTerminalGroup(fromGroup)) return false;
  if (toGroup === "new" && fromGroup !== "new") return false;
  return true;
}

function StatusChip({ row }: { row: TicketStatusRow }) {
  return (
    <Chip
      label={row.label}
      size="small"
      sx={{ bgcolor: row.bg, color: row.color, fontWeight: 600 }}
    />
  );
}

function StatusDialog({
  initial,
  statuses,
  transitions,
  onClose,
}: {
  initial: TicketStatusRow | null;
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const T = useT();
  const isEdit = Boolean(initial);

  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [group, setGroup] = useState(initial?.group ?? "new");
  const [sortOrder, setSortOrder] = useState<number | null>(initial?.sort_order ?? statuses.length + 1);
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);

  const [toKeys, setToKeys] = useState<string[]>(
    initial ? transitions.filter((t) => t.from_key === initial.key).map((t) => t.to_key) : [],
  );
  const [fromKeys, setFromKeys] = useState<string[]>(
    initial ? transitions.filter((t) => t.to_key === initial.key).map((t) => t.from_key) : [],
  );

  const [saving, setSaving] = useState(false);

  const others = statuses.filter((s) => s.key !== (initial?.key ?? key));
  const groupMeta = STATUS_GROUP_BY_KEY[group] ?? STATUS_GROUPS[0];

  // This status may transition TO these (target group reachable from `group`).
  const toOptions = others.filter((s) => transitionAllowed(group, s.group));
  // This status may be transitioned FROM these (this group reachable from theirs).
  const fromOptions = others.filter((s) => transitionAllowed(s.group, group));

  async function submit() {
    const cleanKey = key.trim();
    if (!cleanKey || !label.trim()) return;
    setSaving(true);

    const row = {
      key: cleanKey,
      label: label.trim(),
      group,
      color: groupMeta.color,
      bg: groupMeta.bg,
      sort_order: sortOrder ?? 0,
      is_default: isDefault,
      is_terminal: isTerminalGroup(group),
    };

    // single default: clear the flag on every other status first
    if (isDefault) {
      await supabase
        .from("ticket_statuses")
        .update({ is_default: false })
        .neq("key", cleanKey);
    }

    if (isEdit) {
      await supabase.from("ticket_statuses").update(row).eq("key", cleanKey);
    } else {
      await supabase.from("ticket_statuses").insert(row);
    }

    // reconcile transitions for this status (both directions); drop any edge
    // that the group rules forbid (e.g. a target whose group changed under us)
    const groupOf = new Map(statuses.map((s) => [s.key, s.group]));
    const desiredTo = new Set(
      toKeys.filter((k) => transitionAllowed(group, groupOf.get(k) ?? "new")),
    );
    const desiredFrom = new Set(
      fromKeys.filter((k) => transitionAllowed(groupOf.get(k) ?? "new", group)),
    );
    const existingTo = new Set(
      transitions.filter((t) => t.from_key === cleanKey).map((t) => t.to_key),
    );
    const existingFrom = new Set(
      transitions.filter((t) => t.to_key === cleanKey).map((t) => t.from_key),
    );

    const toInsert: StatusTransition[] = [];
    for (const k of desiredTo) if (!existingTo.has(k)) toInsert.push({ from_key: cleanKey, to_key: k });
    for (const k of desiredFrom) if (!existingFrom.has(k)) toInsert.push({ from_key: k, to_key: cleanKey });

    const toDelete: StatusTransition[] = [];
    for (const k of existingTo) if (!desiredTo.has(k)) toDelete.push({ from_key: cleanKey, to_key: k });
    for (const k of existingFrom) if (!desiredFrom.has(k)) toDelete.push({ from_key: k, to_key: cleanKey });

    if (toInsert.length) await supabase.from("status_transitions").insert(toInsert);
    for (const d of toDelete) {
      await supabase
        .from("status_transitions")
        .delete()
        .eq("from_key", d.from_key)
        .eq("to_key", d.to_key);
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? T.settings.statuses.editStatus : T.settings.statuses.newStatus}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={T.settings.statuses.key}
            value={key}
            onChange={(e) => setKey(e.target.value.replace(/\s+/g, "_").toLowerCase())}
            disabled={isEdit}
            helperText={T.settings.statuses.keyHint}
            fullWidth
          />
          <TextField
            label={T.settings.statuses.label}
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <TextField
              select
              label={T.settings.statuses.group}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {STATUS_GROUPS.map((g) => (
                <MenuItem key={g.key} value={g.key}>
                  <Chip
                    label={T.statusGroups[g.key as keyof typeof T.statusGroups]}
                    size="small"
                    sx={{ bgcolor: g.bg, color: g.color, fontWeight: 600 }}
                  />
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                {T.settings.statuses.preview}
              </Typography>
              <Chip
                label={label || "—"}
                size="small"
                sx={{ bgcolor: groupMeta.bg, color: groupMeta.color, fontWeight: 600, mt: 0.5 }}
              />
            </Box>
          </Stack>
          <NumberField
            label={T.settings.statuses.sortOrder}
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v)}
            sx={{ width: 140 }}
          />
          <Stack direction="row" spacing={3}>
            <FormControlLabel
              control={
                <Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              }
              label={
                <Tooltip title={T.settings.statuses.defaultHint}>
                  <span>{T.settings.statuses.isDefault}</span>
                </Tooltip>
              }
            />
          </Stack>

          <Divider textAlign="left">
            <Typography variant="subtitle2">{T.settings.statuses.transitions}</Typography>
          </Divider>

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {T.settings.statuses.transitionsTo}
            </Typography>
            <Select
              multiple
              fullWidth
              size="small"
              value={toKeys}
              onChange={(e) =>
                setToKeys(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)
              }
              renderValue={(sel) => (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {sel.map((k) => {
                    const s = others.find((o) => o.key === k);
                    return s ? <StatusChip key={k} row={s} /> : null;
                  })}
                </Stack>
              )}
            >
              {toOptions.map((s) => (
                <MenuItem key={s.key} value={s.key}>
                  <Checkbox checked={toKeys.includes(s.key)} size="small" />
                  <ListItemText primary={s.label} />
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {T.settings.statuses.transitionsFrom}
            </Typography>
            <Select
              multiple
              fullWidth
              size="small"
              value={fromKeys}
              onChange={(e) =>
                setFromKeys(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)
              }
              renderValue={(sel) => (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {sel.map((k) => {
                    const s = others.find((o) => o.key === k);
                    return s ? <StatusChip key={k} row={s} /> : null;
                  })}
                </Stack>
              )}
            >
              {fromOptions.map((s) => (
                <MenuItem key={s.key} value={s.key}>
                  <Checkbox checked={fromKeys.includes(s.key)} size="small" />
                  <ListItemText primary={s.label} />
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving || !key.trim() || !label.trim()}
        >
          {T.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function StatusManager({
  statuses,
  transitions,
}: {
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const T = useT();
  const [editing, setEditing] = useState<TicketStatusRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const labelByKey = useMemo(
    () => new Map(statuses.map((s) => [s.key, s])),
    [statuses],
  );

  async function remove(row: TicketStatusRow) {
    if (!window.confirm(T.settings.statuses.deleteConfirm.replace("{name}", row.label)))
      return;
    const { error } = await supabase.from("ticket_statuses").delete().eq("key", row.key);
    if (error) {
      window.alert(T.settings.statuses.deleteInUse);
      return;
    }
    router.refresh();
  }

  const cols = useMemo<ColumnDef<TicketStatusRow, any>[]>(
    () => [
      {
        accessorKey: "sort_order",
        header: T.settings.statuses.sortOrder,
        cell: (c) => c.row.original.sort_order,
      },
      {
        accessorKey: "label",
        header: T.settings.statuses.label,
        cell: (c) => <StatusChip row={c.row.original} />,
      },
      {
        accessorKey: "group",
        header: T.settings.statuses.group,
        cell: (c) =>
          T.statusGroups[c.row.original.group as keyof typeof T.statusGroups] ??
          c.row.original.group,
      },
      {
        id: "flags",
        header: "",
        enableSorting: false,
        cell: (c) => (
          <Stack direction="row" spacing={0.5}>
            {c.row.original.is_default && (
              <Tooltip title={T.settings.statuses.isDefault}>
                <StarIcon fontSize="small" sx={{ color: "#f5a623" }} />
              </Tooltip>
            )}
            {c.row.original.is_terminal && (
              <Tooltip title={T.settings.statuses.isTerminal}>
                <FlagIcon fontSize="small" sx={{ color: "#777" }} />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      {
        id: "to",
        header: T.settings.statuses.transitionsTo,
        enableSorting: false,
        cell: (c) => {
          const targets = transitions
            .filter((t) => t.from_key === c.row.original.key)
            .map((t) => labelByKey.get(t.to_key))
            .filter(Boolean) as TicketStatusRow[];
          return targets.length ? (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
              {targets.map((s) => (
                <StatusChip key={s.key} row={s} />
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              —
            </Typography>
          );
        },
      },
      {
        id: "from",
        header: T.settings.statuses.transitionsFrom,
        enableSorting: false,
        cell: (c) => {
          const sources = transitions
            .filter((t) => t.to_key === c.row.original.key)
            .map((t) => labelByKey.get(t.from_key))
            .filter(Boolean) as TicketStatusRow[];
          return sources.length ? (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
              {sources.map((s) => (
                <StatusChip key={s.key} row={s} />
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              —
            </Typography>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (c) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() => {
                setEditing(c.row.original);
                setDialogOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => remove(c.row.original)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [transitions, labelByKey, T],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          {T.settings.statuses.newStatus}
        </Button>
      </Stack>
      <DataTable data={statuses} columns={cols} storageKey="settings-statuses" />
      {dialogOpen && (
        <StatusDialog
          key={editing?.key ?? "new"}
          initial={editing}
          statuses={statuses}
          transitions={transitions}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </Box>
  );
}
