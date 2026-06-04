"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import CascadingDeviceSelect, {
  type DeviceSelection,
} from "@/components/tickets/CascadingDeviceSelect";
import type { Contact, Profile } from "@/lib/types";

const emptyDevice: DeviceSelection = {
  group_id: null,
  brand_id: null,
  model_id: null,
  modification_id: null,
};

export default function CreateTicketDialog({
  open,
  onClose,
  defaultClientId,
}: {
  open: boolean;
  onClose: () => void;
  defaultClientId?: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [manager, setManager] = useState<Profile | null>(null);
  const [technician, setTechnician] = useState<Profile | null>(null);
  const [client, setClient] = useState<Contact | null>(null);
  const [device, setDevice] = useState<DeviceSelection>(emptyDevice);
  const [snImei, setSnImei] = useState("");
  const [color, setColor] = useState("");
  const [deviceState, setDeviceState] = useState("");
  const [malfunction, setMalfunction] = useState("");
  const [complectation, setComplectation] = useState("");
  const [estPrice, setEstPrice] = useState("");
  const [dueDate, setDueDate] = useState<Dayjs | null>(dayjs().add(1, "day").hour(18).minute(0));
  const [urgent, setUrgent] = useState(false);
  const [managerNotes, setManagerNotes] = useState("");
  const [prepayment, setPrepayment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("*")
      .then(({ data }) => setProfiles(data ?? []));
    supabase
      .from("contacts")
      .select("*")
      .order("first_name")
      .then(({ data }) => {
        setContacts(data ?? []);
        if (defaultClientId) {
          const c = (data ?? []).find((x) => x.id === defaultClientId);
          if (c) setClient(c);
        }
      });
  }, [open, supabase, defaultClientId]);

  function reset() {
    setManager(null);
    setTechnician(null);
    setClient(null);
    setDevice(emptyDevice);
    setSnImei("");
    setColor("");
    setDeviceState("");
    setMalfunction("");
    setComplectation("");
    setEstPrice("");
    setDueDate(dayjs().add(1, "day").hour(18).minute(0));
    setUrgent(false);
    setManagerNotes("");
    setPrepayment("");
  }

  async function submit(openAfter: boolean) {
    setSaving(true);
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        status: "new",
        manager_id: manager?.id ?? null,
        technician_id: technician?.id ?? null,
        client_id: client?.id ?? null,
        group_id: device.group_id,
        brand_id: device.brand_id,
        model_id: device.model_id,
        modification_id: device.modification_id,
        sn_imei: snImei || null,
        color: color || null,
        device_state: deviceState || null,
        malfunction: malfunction || null,
        complectation: complectation || null,
        est_price: Number(estPrice) || 0,
        prepayment: Number(prepayment) || 0,
        due_date: dueDate ? dueDate.toISOString() : null,
        urgent,
        manager_notes: managerNotes || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      return;
    }

    // record prepayment as a ledger row tied to the client
    if (client && Number(prepayment) > 0) {
      await supabase.from("payments").insert({
        contact_id: client.id,
        ticket_id: data.id,
        kind: "prepayment",
        amount: Number(prepayment),
        comment: "Передоплата при створенні заявки",
      });
    }

    setSaving(false);
    reset();
    onClose();
    router.refresh();
    if (openAfter) router.push(`/workflows/${data.id}`);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        Нова заявка
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={manager}
            onChange={(_, o) => setManager(o)}
            renderInput={(p) => <TextField {...p} label="Менеджер" />}
          />
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={technician}
            onChange={(_, o) => setTechnician(o)}
            renderInput={(p) => <TextField {...p} label="Технік" />}
          />

          <Divider textAlign="left">
            <Typography variant="subtitle2">Пристрій</Typography>
          </Divider>

          <TextField
            label="Серійний номер / IMEI"
            value={snImei}
            onChange={(e) => setSnImei(e.target.value)}
            fullWidth
          />
          <CascadingDeviceSelect value={device} onChange={setDevice} />
          <TextField
            label="Колір"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            fullWidth
          />
          <TextField
            label="Стан"
            value={deviceState}
            onChange={(e) => setDeviceState(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Divider textAlign="left">
            <Typography variant="subtitle2">Клієнт</Typography>
          </Divider>

          <Autocomplete
            options={contacts}
            getOptionLabel={(o) =>
              `${[o.first_name, o.last_name].filter(Boolean).join(" ")}${
                o.phone ? ` — ${o.phone}` : ""
              }`
            }
            value={client}
            onChange={(_, o) => setClient(o)}
            renderInput={(p) => (
              <TextField {...p} label="Клієнт" placeholder="Ім'я або телефон" />
            )}
          />
          <TextField
            label="Несправність"
            value={malfunction}
            onChange={(e) => setMalfunction(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Комплектація"
            value={complectation}
            onChange={(e) => setComplectation(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Орієнтовна ціна"
            type="number"
            value={estPrice}
            onChange={(e) => setEstPrice(e.target.value)}
            fullWidth
          />
          <DateTimePicker
            label="Термін"
            value={dueDate}
            onChange={(v) => setDueDate(v)}
            format="DD.MM.YYYY HH:mm"
            slotProps={{ textField: { fullWidth: true } }}
          />
          <FormControlLabel
            control={
              <Checkbox checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            }
            label="Терміново"
          />
          <TextField
            label="Нотатки менеджера"
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Передоплата"
            type="number"
            value={prepayment}
            onChange={(e) => setPrepayment(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button onClick={() => submit(false)} disabled={saving} variant="outlined">
          {T.common.create}
        </Button>
        <Button onClick={() => submit(true)} disabled={saving} variant="contained">
          {T.common.createAndOpen}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
