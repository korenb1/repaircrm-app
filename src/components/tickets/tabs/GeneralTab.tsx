"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { createClient } from "@/lib/supabase/client";
import type { Profile, TicketRow } from "@/lib/types";

export default function GeneralTab({
  ticket,
  profiles,
  registerSave,
}: {
  ticket: TicketRow;
  profiles: Profile[];
  registerSave?: (fn: (() => Promise<void>) | null) => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [manager, setManager] = useState<Profile | null>(
    profiles.find((p) => p.id === ticket.manager_id) ?? null,
  );
  const [technician, setTechnician] = useState<Profile | null>(
    profiles.find((p) => p.id === ticket.technician_id) ?? null,
  );
  const [snImei, setSnImei] = useState(ticket.sn_imei ?? "");
  const [deviceState, setDeviceState] = useState(ticket.device_state ?? "");
  const [malfunction, setMalfunction] = useState(ticket.malfunction ?? "");
  const [complectation, setComplectation] = useState(ticket.complectation ?? "");
  const [estPrice, setEstPrice] = useState(String(ticket.est_price ?? 0));
  const [dueDate, setDueDate] = useState<Dayjs | null>(
    ticket.due_date ? dayjs(ticket.due_date) : null,
  );
  const [urgent, setUrgent] = useState(ticket.urgent);
  const [managerNotes, setManagerNotes] = useState(ticket.manager_notes ?? "");

  async function save() {
    await supabase
      .from("tickets")
      .update({
        manager_id: manager?.id ?? null,
        technician_id: technician?.id ?? null,
        sn_imei: snImei || null,
        device_state: deviceState || null,
        malfunction: malfunction || null,
        complectation: complectation || null,
        est_price: Number(estPrice) || 0,
        due_date: dueDate ? dueDate.toISOString() : null,
        urgent,
        manager_notes: managerNotes || null,
      })
      .eq("id", ticket.id);
    router.refresh();
  }

  // Register this tab's save handler with the parent's shared SAVE button.
  useEffect(() => {
    registerSave?.(save);
    return () => registerSave?.(null);
  });

  return (
    <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={manager}
            onChange={(_, o) => setManager(o)}
            renderInput={(p) => <TextField {...p} label="Менеджер" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={technician}
            onChange={(_, o) => setTechnician(o)}
            renderInput={(p) => <TextField {...p} label="Технік" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Група"
            value={ticket.group?.name ?? "—"}
            fullWidth
            disabled
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Модель"
            value={ticket.model?.name ?? "—"}
            fullWidth
            disabled
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Серійний номер / IMEI"
            value={snImei}
            onChange={(e) => setSnImei(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Стан"
            value={deviceState}
            onChange={(e) => setDeviceState(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Несправність"
            value={malfunction}
            onChange={(e) => setMalfunction(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Комплектація"
            value={complectation}
            onChange={(e) => setComplectation(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Орієнтовна ціна"
            type="number"
            value={estPrice}
            onChange={(e) => setEstPrice(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <DateTimePicker
            label="Термін"
            value={dueDate}
            onChange={(v) => setDueDate(v)}
            format="DD.MM.YYYY HH:mm"
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={
              <Checkbox checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            }
            label="Терміново"
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Нотатки менеджера"
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
      </Grid>
  );
}
