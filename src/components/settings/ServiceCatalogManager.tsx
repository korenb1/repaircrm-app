"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import NumberField from "@/components/NumberField";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { T, ITEM_KINDS } from "@/lib/constants";
import { formatUAH } from "@/lib/money";
import type { ItemKind, ServiceCatalogItem } from "@/lib/types";

const KIND_OPTIONS: ItemKind[] = ["labor", "service", "product"];

function ItemDialog({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: ServiceCatalogItem | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [kind, setKind] = useState<ItemKind>(initial?.kind ?? "service");
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [price, setPrice] = useState<number | null>(initial?.price ?? 0);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      kind,
      name: name.trim(),
      sku: sku.trim() || null,
      price: price ?? 0,
    };
    if (initial) {
      await supabase.from("service_catalog").update(payload).eq("id", initial.id);
    } else {
      await supabase.from("service_catalog").insert(payload);
    }
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {initial ? T.settings.services.editItem : T.settings.services.newItem}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label={T.settings.services.kind}
            value={kind}
            onChange={(e) => setKind(e.target.value as ItemKind)}
            fullWidth
          >
            {KIND_OPTIONS.map((k) => (
              <MenuItem key={k} value={k}>
                {ITEM_KINDS[k]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={T.settings.services.name}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label={T.settings.services.sku}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            fullWidth
          />
          <NumberField
            label={T.settings.services.price}
            value={price}
            onValueChange={(v) => setPrice(v)}
            fullWidth
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

export default function ServiceCatalogManager({
  services,
}: {
  services: ServiceCatalogItem[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null);

  async function remove(row: ServiceCatalogItem) {
    if (!window.confirm(T.settings.services.deleteConfirm.replace("{name}", row.name)))
      return;
    await supabase.from("service_catalog").delete().eq("id", row.id);
    router.refresh();
  }

  const cols = useMemo<ColumnDef<ServiceCatalogItem, any>[]>(
    () => [
      {
        accessorKey: "kind",
        header: T.settings.services.kind,
        cell: (c) => ITEM_KINDS[c.row.original.kind],
      },
      { accessorKey: "name", header: T.settings.services.name },
      {
        accessorKey: "sku",
        header: T.settings.services.sku,
        cell: (c) => c.row.original.sku ?? "—",
      },
      {
        accessorKey: "price",
        header: T.settings.services.price,
        cell: (c) => formatUAH(c.row.original.price),
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
      <Stack direction="row" sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          {T.settings.services.newItem}
        </Button>
      </Stack>
      <DataTable data={services} columns={cols} />
      {dialogOpen && (
        <ItemDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          initial={editing}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </Box>
  );
}
