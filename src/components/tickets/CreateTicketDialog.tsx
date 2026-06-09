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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import { useStatuses } from "@/lib/status-context";
import CascadingDeviceSelect, {
  type DeviceSelection,
  emptyDeviceSelection,
  resolveDeviceSelection,
} from "@/components/tickets/CascadingDeviceSelect";
import SnImeiField from "@/components/tickets/SnImeiField";
import ClientAutocomplete from "@/components/tickets/ClientAutocomplete";
import type { Contact, DeviceRow, Profile } from "@/lib/types";

const FILL = "Заповніть це поле";

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
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { statuses } = useStatuses();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [manager, setManager] = useState<Profile | null>(null);
  const [technician, setTechnician] = useState<Profile | null>(null);
  const [client, setClient] = useState<Contact | null>(null);
  const [device, setDevice] = useState<DeviceSelection>(emptyDeviceSelection);
  const [snImei, setSnImei] = useState("");
  const [deviceState, setDeviceState] = useState("");
  const [malfunction, setMalfunction] = useState("");
  const [complectation, setComplectation] = useState("");
  const [estPrice, setEstPrice] = useState("");
  const [dueDate, setDueDate] = useState<Dayjs | null>(dayjs().add(1, "day").hour(18).minute(0));
  const [urgent, setUrgent] = useState(false);
  const [managerNotes, setManagerNotes] = useState("");
  const [prepayment, setPrepayment] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

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
    setDevice(emptyDeviceSelection);
    setSnImei("");
    setDeviceState("");
    setMalfunction("");
    setComplectation("");
    setEstPrice("");
    setDueDate(dayjs().add(1, "day").hour(18).minute(0));
    setUrgent(false);
    setManagerNotes("");
    setPrepayment("");
    setAttempted(false);
  }

  // Apply an existing device picked from the SN/IMEI search: autofill catalog
  // and owner so the SN stays rigidly tied to one device across the base.
  function applyDevice(d: DeviceRow) {
    setSnImei(d.sn_imei);
    setDevice({
      group_id: d.group_id,
      group_name: d.group?.name ?? "",
      brand_id: d.brand_id,
      brand_name: d.brand?.name ?? "",
      model_id: d.model_id,
      model_name: d.model?.name ?? "",
      modification_id: d.modification_id,
      modification_name: d.modification?.name ?? "",
    });
    if (d.client) {
      const c = d.client;
      setClient(c);
      setContacts((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
    }
  }

  // Mandatory: manager, technician, SN/IMEI, group, brand, model, client, malfunction.
  const canSubmit =
    !!manager &&
    !!technician &&
    !!snImei.trim() &&
    !!device.group_name.trim() &&
    !!device.brand_name.trim() &&
    !!device.model_name.trim() &&
    !!client &&
    !!malfunction.trim();

  async function submit(openAfter: boolean) {
    if (!canSubmit) {
      setAttempted(true);
      return;
    }
    setSaving(true);

    // Resolve catalog ids (creating any manually-typed group/brand/model/mod).
    const ids = await resolveDeviceSelection(supabase, device);

    // Upsert the device by its unique SN/IMEI: reuse if it exists, else create.
    let deviceId: number | null = null;
    const { data: existingDevice } = await supabase
      .from("devices")
      .select("id")
      .eq("sn_imei", snImei.trim())
      .maybeSingle();
    if (existingDevice) {
      deviceId = existingDevice.id;
    } else {
      const { data: newDevice } = await supabase
        .from("devices")
        .insert({
          sn_imei: snImei.trim(),
          group_id: ids.group_id,
          brand_id: ids.brand_id,
          model_id: ids.model_id,
          modification_id: ids.modification_id,
          client_id: client?.id ?? null,
        })
        .select("id")
        .single();
      deviceId = newDevice?.id ?? null;
    }

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        status: statuses.find((s) => s.is_default)?.key ?? statuses[0]?.key ?? "new",
        manager_id: manager?.id ?? null,
        technician_id: technician?.id ?? null,
        client_id: client?.id ?? null,
        device_id: deviceId,
        group_id: ids.group_id,
        brand_id: ids.brand_id,
        model_id: ids.model_id,
        modification_id: ids.modification_id,
        sn_imei: snImei.trim() || null,
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
    // Navigate first (when opening the new ticket), then refresh last so the
    // list refetch isn't aborted by the subsequent push navigation.
    if (openAfter) router.push(`/workflows/${data.id}`);
    router.refresh();
  }

  // Clear the form whenever the dialog is dismissed (cancel / backdrop / X) so
  // a fresh open starts empty.
  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        Нова заявка
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={handleClose} size="small">
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
            renderInput={(p) => (
              <TextField
                {...p}
                label="Менеджер"
                required
                error={attempted && !manager}
                helperText={attempted && !manager ? FILL : undefined}
              />
            )}
          />
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={technician}
            onChange={(_, o) => setTechnician(o)}
            renderInput={(p) => (
              <TextField
                {...p}
                label="Технік"
                required
                error={attempted && !technician}
                helperText={attempted && !technician ? FILL : undefined}
              />
            )}
          />

          <Divider textAlign="left">
            <Typography variant="subtitle2">Клієнт</Typography>
          </Divider>

          <ClientAutocomplete
            contacts={contacts}
            value={client}
            onChange={setClient}
            onContactCreated={(c) =>
              setContacts((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]))
            }
            required
            error={attempted && !client}
            helperText={attempted && !client ? FILL : undefined}
          />

          <Divider textAlign="left">
            <Typography variant="subtitle2">Пристрій</Typography>
          </Divider>

          <SnImeiField
            value={snImei}
            onChange={setSnImei}
            onSelectDevice={applyDevice}
            required
            error={attempted && !snImei.trim()}
            helperText={attempted && !snImei.trim() ? FILL : undefined}
          />
          <CascadingDeviceSelect value={device} onChange={setDevice} showErrors={attempted} />
          <TextField
            label="Стан"
            value={deviceState}
            onChange={(e) => setDeviceState(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Несправність"
            value={malfunction}
            onChange={(e) => setMalfunction(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            required
            error={attempted && !malfunction.trim()}
            helperText={attempted && !malfunction.trim() ? FILL : undefined}
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
        <Button onClick={handleClose}>{T.common.cancel}</Button>
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
