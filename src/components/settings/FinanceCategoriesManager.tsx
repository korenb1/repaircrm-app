"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
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
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type { FinanceCategory, FinanceKind } from "@/lib/types";

function CategoryDialog({
  kind,
  initial,
  count,
  onClose,
}: {
  kind: FinanceKind;
  initial: FinanceCategory | null;
  count: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [sortOrder, setSortOrder] = useState<number | null>(
    initial?.sort_order ?? count + 1,
  );
  const [isDefault, setIsDefault] = useState(initial?.is_default_closed ?? false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const clean = name.trim();
    if (!clean) return;
    setSaving(true);

    const row = {
      kind,
      name: clean,
      sort_order: sortOrder ?? 0,
      is_default_closed: isDefault,
    };

    // Single default per kind: clear the flag on the other categories first
    // so the partial unique index never rejects the write.
    if (isDefault) {
      const clear = supabase
        .from("finance_categories")
        .update({ is_default_closed: false })
        .eq("kind", kind);
      if (isEdit) await clear.neq("id", initial!.id);
      else await clear;
    }

    if (isEdit) {
      await supabase.from("finance_categories").update(row).eq("id", initial!.id);
    } else {
      await supabase.from("finance_categories").insert(row);
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isEdit ? T.settings.finances.editCategory : T.settings.finances.newCategory}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={T.settings.finances.name}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <NumberField
            label={T.settings.finances.sortOrder}
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v)}
            sx={{ width: 140 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
            }
            label={
              <Tooltip title={T.settings.finances.defaultClosedHint}>
                <span>{T.settings.finances.isDefaultClosed}</span>
              </Tooltip>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !name.trim()}>
          {T.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CategorySection({
  kind,
  title,
  categories,
}: {
  kind: FinanceKind;
  title: string;
  categories: FinanceCategory[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function remove(row: FinanceCategory) {
    if (!window.confirm(T.settings.finances.deleteConfirm.replace("{name}", row.name)))
      return;
    await supabase.from("finance_categories").delete().eq("id", row.id);
    router.refresh();
  }

  const cols = useMemo<ColumnDef<FinanceCategory, any>[]>(
    () => [
      {
        accessorKey: "sort_order",
        header: T.settings.finances.sortOrder,
        cell: (c) => c.row.original.sort_order,
      },
      { accessorKey: "name", header: T.settings.finances.name },
      {
        id: "default",
        header: "",
        enableSorting: false,
        cell: (c) =>
          c.row.original.is_default_closed ? (
            <Tooltip title={T.settings.finances.defaultClosedHint}>
              <StarIcon fontSize="small" sx={{ color: "#f5a623" }} />
            </Tooltip>
          ) : null,
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
    [],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          {T.settings.finances.newCategory}
        </Button>
      </Stack>
      {categories.length ? (
        <DataTable data={categories} columns={cols} storageKey="settings-finance-categories" />
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
          {T.settings.finances.noCategories}
        </Typography>
      )}
      {dialogOpen && (
        <CategoryDialog
          key={editing?.id ?? "new"}
          kind={kind}
          initial={editing}
          count={categories.length}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </Box>
  );
}

export default function FinanceCategoriesManager({
  categories,
}: {
  categories: FinanceCategory[];
}) {
  const revenue = categories.filter((c) => c.kind === "revenue");
  const expense = categories.filter((c) => c.kind === "expense");

  return (
    <Stack spacing={4}>
      <CategorySection
        kind="revenue"
        title={T.settings.finances.revenue}
        categories={revenue}
      />
      <CategorySection
        kind="expense"
        title={T.settings.finances.expense}
        categories={expense}
      />
    </Stack>
  );
}
