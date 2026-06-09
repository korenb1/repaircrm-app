"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import UserAvatar from "@/components/ui/UserAvatar";
import { createClient } from "@/lib/supabase/client";
import { T, ITEM_KINDS } from "@/lib/constants";
import { formatUAH } from "@/lib/money";
import type { Profile, ServiceCatalogItem, TicketItem } from "@/lib/types";

export default function ItemsTab({
  ticketId,
  items,
  profiles,
  catalog,
  conclusion,
  registerSave,
}: {
  ticketId: number;
  items: TicketItem[];
  profiles: Profile[];
  catalog: ServiceCatalogItem[];
  conclusion: string | null;
  registerSave?: (fn: (() => Promise<void>) | null) => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [technician, setTechnician] = useState<Profile | null>(null);
  const [picked, setPicked] = useState<ServiceCatalogItem | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [concl, setConcl] = useState(conclusion ?? "");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TicketItem | null>(null);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0),
    [items],
  );

  const profileById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  async function addItem() {
    if (!name && !picked) return;
    setBusy(true);
    await supabase.from("ticket_items").insert({
      ticket_id: ticketId,
      technician_id: technician?.id ?? null,
      kind: picked?.kind ?? "labor",
      name: picked?.name ?? name,
      price: Number(price || picked?.price || 0),
      qty: Number(qty) || 1,
    });
    setBusy(false);
    setPicked(null);
    setName("");
    setPrice("");
    setQty("1");
    router.refresh();
  }

  async function removeItem(id: number) {
    await supabase.from("ticket_items").delete().eq("id", id);
    setPendingDelete(null);
    router.refresh();
  }

  async function saveNotes() {
    await supabase
      .from("tickets")
      .update({ conclusion: concl || null })
      .eq("id", ticketId);
    router.refresh();
  }

  // Register notes/conclusion save with the parent's shared SAVE button.
  useEffect(() => {
    registerSave?.(saveNotes);
    return () => registerSave?.(null);
  });

  const cols = useMemo<ColumnDef<TicketItem, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Назва",
        cell: (c) => (
          <Box>
            <Typography variant="body2">{c.row.original.name}</Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {ITEM_KINDS[c.row.original.kind]}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: "price",
        header: "Ціна",
        cell: (c) => formatUAH(c.row.original.price),
      },
      { accessorKey: "qty", header: "К-сть" },
      {
        id: "amount",
        header: "Сума",
        cell: (c) => formatUAH(Number(c.row.original.price) * Number(c.row.original.qty)),
      },
      {
        id: "technician",
        header: "Технік",
        cell: (c) => {
          const t = c.row.original.technician_id
            ? profileById.get(c.row.original.technician_id)
            : null;
          return t ? (
            <UserAvatar name={t.full_name} avatarPath={t.avatar_path} />
          ) : (
            "—"
          );
        },
      },
      {
        id: "actions",
        header: "",
        size: 64,
        enableResizing: false,
        cell: (c) => (
          <IconButton
            size="small"
            color="error"
            title={T.common.delete}
            onClick={() => setPendingDelete(c.row.original)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [profileById],
  );

  return (
    <Box>
      <Grid
        container
        spacing={2}
        sx={{
          alignItems: "center",
          mb: 2
        }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={technician}
            onChange={(_, o) => setTechnician(o)}
            renderInput={(p) => <TextField {...p} label="Технік" size="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Autocomplete
            freeSolo
            options={catalog}
            getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
            value={picked}
            onInputChange={(_, v) => setName(v)}
            onChange={(_, o) => {
              if (o && typeof o !== "string") {
                setPicked(o);
                setName(o.name);
                setPrice(String(o.price));
              } else {
                setPicked(null);
              }
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label="Робота, послуга або товар"
                size="small"
                placeholder="Назва, код, SKU"
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            label="Ціна"
            type="number"
            size="small"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <TextField
            label="К-сть"
            type="number"
            size="small"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addItem}
            disabled={busy}
            fullWidth
          >
            {T.common.add}
          </Button>
        </Grid>
      </Grid>
      <DataTable data={items} columns={cols} dense maxHeight={360} emptyText="Немає позицій" storageKey="ticket-items" />
      <Stack
        spacing={0.5}
        sx={{
          alignItems: "flex-end",
          mt: 1.5
        }}>
        <Typography variant="body2">
          Підсумок: <b>{formatUAH(subtotal)}</b>
        </Typography>
        <Typography variant="subtitle1">
          Разом: <b>{formatUAH(subtotal)}</b>
        </Typography>
      </Stack>
      <Stack spacing={2} sx={{
        mt: 2
      }}>
        <TextField
          label="Висновок / рекомендації клієнту"
          value={concl}
          onChange={(e) => setConcl(e.target.value)}
          fullWidth
          multiline
          minRows={3}
        />
      </Stack>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <DialogTitle>{T.ticket.items.deleteTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {T.ticket.items.deleteConfirm.replace(
              "{name}",
              pendingDelete?.name ?? "",
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>
            {T.common.cancel}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => pendingDelete && removeItem(pendingDelete.id)}
          >
            {T.common.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
