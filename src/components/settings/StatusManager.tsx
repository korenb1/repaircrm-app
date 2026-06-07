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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import FlagIcon from "@mui/icons-material/Flag";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type { TicketStatusRow, StatusTransition } from "@/lib/types";

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
  const isEdit = Boolean(initial);

  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState(initial?.color ?? "#616161");
  const [bg, setBg] = useState(initial?.bg ?? "#eeeeee");
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? statuses.length + 1));
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [isTerminal, setIsTerminal] = useState(initial?.is_terminal ?? false);

  const [toKeys, setToKeys] = useState<string[]>(
    initial ? transitions.filter((t) => t.from_key === initial.key).map((t) => t.to_key) : [],
  );
  const [fromKeys, setFromKeys] = useState<string[]>(
    initial ? transitions.filter((t) => t.to_key === initial.key).map((t) => t.from_key) : [],
  );

  const [saving, setSaving] = useState(false);

  const others = statuses.filter((s) => s.key !== (initial?.key ?? key));

  async function submit() {
    const cleanKey = key.trim();
    if (!cleanKey || !label.trim()) return;
    setSaving(true);

    const row = {
      key: cleanKey,
      label: label.trim(),
      color,
      bg,
      sort_order: Number(sortOrder) || 0,
      is_default: isDefault,
      is_terminal: isTerminal,
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

    // reconcile transitions for this status (both directions)
    const desiredTo = new Set(toKeys);
    const desiredFrom = new Set(fromKeys);
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
              label={T.settings.statuses.color}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              sx={{ width: 110 }}
            />
            <TextField
              label={T.settings.statuses.bg}
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              sx={{ width: 110 }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                {T.settings.statuses.preview}
              </Typography>
              <Chip
                label={label || "—"}
                size="small"
                sx={{ bgcolor: bg, color, fontWeight: 600, mt: 0.5 }}
              />
            </Box>
          </Stack>
          <TextField
            label={T.settings.statuses.sortOrder}
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
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
            <FormControlLabel
              control={
                <Checkbox checked={isTerminal} onChange={(e) => setIsTerminal(e.target.checked)} />
              }
              label={
                <Tooltip title={T.settings.statuses.terminalHint}>
                  <span>{T.settings.statuses.isTerminal}</span>
                </Tooltip>
              }
            />
          </Stack>

          <Divider textAlign="left">
            <Typography variant="subtitle2">Переходи</Typography>
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
              {others.map((s) => (
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
              {others.map((s) => (
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
      window.alert(
        "Неможливо видалити: статус використовується заявками або переходами.",
      );
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
    [transitions, labelByKey],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          {T.settings.statuses.newStatus}
        </Button>
      </Stack>
      <DataTable data={statuses} columns={cols} />
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
