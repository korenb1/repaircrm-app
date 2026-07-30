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
import NumberField from "@/components/NumberField";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import UserAvatar from "@/components/ui/UserAvatar";
import { createClient } from "@/lib/supabase/client";
import { useT, useMoney } from "@/lib/i18n/context";
import type { Profile, ServiceCatalogItem, TicketItem } from "@/lib/types";

export default function ItemsTab({
  ticketId,
  items,
  profiles,
  catalog,
  conclusion,
  registerSave,
  locked = false,
}: {
  ticketId: number;
  items: TicketItem[];
  profiles: Profile[];
  catalog: ServiceCatalogItem[];
  conclusion: string | null;
  registerSave?: (fn: (() => Promise<void>) | null) => void;
  locked?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const T = useT();
  const money = useMoney();

  const [technician, setTechnician] = useState<Profile | null>(null);
  const [technicianError, setTechnicianError] = useState(false);
  const [picked, setPicked] = useState<ServiceCatalogItem | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [qty, setQty] = useState<number | null>(1);
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
    if (!technician) {
      setTechnicianError(true);
      return;
    }
    setBusy(true);
    await supabase.from("ticket_items").insert({
      ticket_id: ticketId,
      technician_id: technician?.id ?? null,
      kind: picked?.kind ?? "labor",
      name: picked?.name ?? name,
      price: price ?? picked?.price ?? 0,
      qty: qty ?? 1,
    });
    setBusy(false);
    setPicked(null);
    setName("");
    setPrice(null);
    setQty(1);
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
        header: T.ticket.items.name,
        cell: (c) => (
          <Box>
            <Typography variant="body2">{c.row.original.name}</Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {T.itemKinds[c.row.original.kind]}
            </Typography>
          </Box>
        ),
      },
      {
        accessorKey: "price",
        header: T.ticket.items.price,
        cell: (c) => money(c.row.original.price),
      },
      { accessorKey: "qty", header: T.ticket.items.qty },
      {
        id: "amount",
        header: T.ticket.items.amount,
        cell: (c) => money(Number(c.row.original.price) * Number(c.row.original.qty)),
      },
      {
        id: "technician",
        header: T.ticket.items.technician,
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
            disabled={locked}
            onClick={() => setPendingDelete(c.row.original)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [profileById, locked, T, money],
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
            disabled={locked}
            onChange={(_, o) => {
              setTechnician(o);
              if (o) setTechnicianError(false);
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label={T.ticket.items.technician}
                size="small"
                required
                error={technicianError}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Autocomplete
            freeSolo
            options={catalog}
            disabled={locked}
            getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
            renderOption={(props, o) => {
              const { key: _key, ...rest } = props as typeof props & { key?: string };
              return (
                <li {...rest} key={typeof o === "string" ? o : o.id}>
                  {typeof o === "string" ? o : o.name}
                </li>
              );
            }}
            value={picked}
            onInputChange={(_, v) => setName(v)}
            onChange={(_, o) => {
              if (o && typeof o !== "string") {
                setPicked(o);
                setName(o.name);
                setPrice(o.price);
              } else {
                setPicked(null);
              }
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label={T.ticket.items.pickItem}
                size="small"
                placeholder={T.ticket.items.pickItemPlaceholder}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <NumberField
            label={T.ticket.items.price}
            size="small"
            value={price}
            onValueChange={(v) => setPrice(v)}
            disabled={locked}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2 }}>
          <NumberField
            label={T.ticket.items.qty}
            size="small"
            value={qty}
            onValueChange={(v) => setQty(v)}
            min={1}
            disabled={locked}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addItem}
            disabled={busy || locked}
            fullWidth
          >
            {T.common.add}
          </Button>
        </Grid>
      </Grid>
      <DataTable data={items} columns={cols} dense maxHeight={360} emptyText={T.ticket.items.empty} storageKey="ticket-items" />
      <Stack
        spacing={0.5}
        sx={{
          alignItems: "flex-end",
          mt: 1.5
        }}>
        <Typography variant="body2">
          {T.ticket.items.subtotal}: <b>{money(subtotal)}</b>
        </Typography>
        <Typography variant="subtitle1">
          {T.ticket.items.total}: <b>{money(subtotal)}</b>
        </Typography>
      </Stack>
      <Stack spacing={2} sx={{
        mt: 2
      }}>
        <TextField
          label={T.ticket.items.conclusion}
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
