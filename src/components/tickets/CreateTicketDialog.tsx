"use client";
import { useEffect, useState } from "react";
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
import { useRouter } from "next/navigation";
import NumberField from "@/components/NumberField";
import UserAvatar from "@/components/ui/UserAvatar";
import CloseIcon from "@mui/icons-material/Close";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { createClient } from "@/lib/supabase/client";
import { formatEntries, mergePending } from "@/lib/directory";
import { T } from "@/lib/constants";
import { useStatuses } from "@/lib/status-context";
import CascadingDeviceSelect, {
  type DeviceSelection,
  emptyDeviceSelection,
  resolveDeviceSelection,
} from "@/components/tickets/CascadingDeviceSelect";
import SnImeiField from "@/components/tickets/SnImeiField";
import ClientAutocomplete from "@/components/tickets/ClientAutocomplete";
import DirectoryMultiSelect from "@/components/tickets/DirectoryMultiSelect";
import PaymentDialog from "@/components/tickets/PaymentDialog";
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
  const supabase = createClient();
  const router = useRouter();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { statuses } = useStatuses();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [malfunctionOpts, setMalfunctionOpts] = useState<string[]>([]);
  const [equipmentOpts, setEquipmentOpts] = useState<string[]>([]);

  const [manager, setManager] = useState<Profile | null>(null);
  const [technician, setTechnician] = useState<Profile | null>(null);
  const [client, setClient] = useState<Contact | null>(null);
  const [device, setDevice] = useState<DeviceSelection>(emptyDeviceSelection);
  const [snImei, setSnImei] = useState("");
  const [deviceState, setDeviceState] = useState("");
  const [malfunction, setMalfunction] = useState<string[]>([]);
  const [malfunctionInput, setMalfunctionInput] = useState("");
  const [complectation, setComplectation] = useState<string[]>([]);
  const [equipmentInput, setEquipmentInput] = useState("");
  const [estPrice, setEstPrice] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Dayjs | null>(dayjs().add(1, "day").hour(18).minute(0));
  const [urgent, setUrgent] = useState(false);
  const [managerNotes, setManagerNotes] = useState("");
  const [prepayment, setPrepayment] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  // After saving a ticket with a prepayment, collect the prepayment through the
  // standard payment dialog (so an account is chosen) before finishing.
  const [prepayDialog, setPrepayDialog] = useState<{
    ticketId: number;
    amount: number;
    openAfter: boolean;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("*")
      .then(({ data }) => setProfiles(data ?? []));
    supabase
      .from("malfunctions")
      .select("name")
      .order("sort_order")
      .order("name")
      .then(({ data }) => setMalfunctionOpts((data ?? []).map((r) => r.name)));
    supabase
      .from("equipment_items")
      .select("name")
      .order("sort_order")
      .order("name")
      .then(({ data }) => setEquipmentOpts((data ?? []).map((r) => r.name)));
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
    setMalfunction([]);
    setMalfunctionInput("");
    setComplectation([]);
    setEquipmentInput("");
    setEstPrice(null);
    setDueDate(dayjs().add(1, "day").hour(18).minute(0));
    setUrgent(false);
    setManagerNotes("");
    setPrepayment(null);
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
    mergePending(malfunction, malfunctionInput).length > 0;

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
        malfunction: formatEntries(mergePending(malfunction, malfunctionInput)) || null,
        complectation: formatEntries(mergePending(complectation, equipmentInput)) || null,
        est_price: estPrice ?? 0,
        prepayment: prepayment ?? 0,
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

    setSaving(false);

    // A prepayment is collected via the standard payment dialog so the cashier
    // picks which finance account receives it. Otherwise finish immediately.
    if (client && (prepayment ?? 0) > 0) {
      setPrepayDialog({ ticketId: data.id, amount: prepayment ?? 0, openAfter });
      return;
    }

    finalize(openAfter, data.id);
  }

  // Reset the form, close, and navigate to the tickets context once the ticket
  // (and any prepayment) is fully recorded. Use a soft navigation (router.push)
  // so "Створити й відкрити" opens the ticket through the intercepting @modal
  // route (a hard navigation would render the full /workflows/[id] page instead
  // of the modal). router.refresh() then revalidates the underlying list so the
  // new ticket shows without a manual reload.
  function finalize(openAfter: boolean, ticketId: number) {
    reset();
    onClose();
    if (openAfter) {
      // Soft-navigate only (no refresh): router.refresh() right after a push to
      // an intercepted route cancels the interception and renders the full page.
      router.push(`/workflows/${ticketId}`);
    } else {
      router.push("/workflows");
      router.refresh();
    }
  }

  // Clear the form whenever the dialog is dismissed (cancel / backdrop / X) so
  // a fresh open starts empty.
  function handleClose() {
    reset();
    onClose();
  }

  return (
    <>
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
            renderOption={(props, o) => {
              const { key, ...rest } = props;
              return (
                <Box component="li" key={key} {...rest} sx={{ display: "flex", gap: 1 }}>
                  <UserAvatar name={o.full_name} avatarPath={o.avatar_path} size={24} />
                  {o.full_name}
                </Box>
              );
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label="Менеджер"
                required
                error={attempted && !manager}
                helperText={attempted && !manager ? FILL : undefined}
                slotProps={{
                  ...p.slotProps,
                  input: {
                    ...p.slotProps.input,
                    startAdornment: manager ? (
                      <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
                        <UserAvatar name={manager.full_name} avatarPath={manager.avatar_path} size={24} />
                      </Box>
                    ) : (
                      p.slotProps.input.startAdornment
                    ),
                  },
                }}
              />
            )}
          />
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={technician}
            onChange={(_, o) => setTechnician(o)}
            renderOption={(props, o) => {
              const { key, ...rest } = props;
              return (
                <Box component="li" key={key} {...rest} sx={{ display: "flex", gap: 1 }}>
                  <UserAvatar name={o.full_name} avatarPath={o.avatar_path} size={24} />
                  {o.full_name}
                </Box>
              );
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label="Технік"
                required
                error={attempted && !technician}
                helperText={attempted && !technician ? FILL : undefined}
                slotProps={{
                  ...p.slotProps,
                  input: {
                    ...p.slotProps.input,
                    startAdornment: technician ? (
                      <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
                        <UserAvatar name={technician.full_name} avatarPath={technician.avatar_path} size={24} />
                      </Box>
                    ) : (
                      p.slotProps.input.startAdornment
                    ),
                  },
                }}
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
          <DirectoryMultiSelect
            label="Несправність"
            table="malfunctions"
            options={malfunctionOpts}
            value={malfunction}
            onChange={setMalfunction}
            onOptionAdded={(n) => setMalfunctionOpts((p) => [...p, n])}
            inputValue={malfunctionInput}
            onInputValueChange={setMalfunctionInput}
            required
            error={attempted && mergePending(malfunction, malfunctionInput).length === 0}
            helperText={
              attempted && mergePending(malfunction, malfunctionInput).length === 0
                ? FILL
                : undefined
            }
          />
          <DirectoryMultiSelect
            label="Комплектація"
            table="equipment_items"
            options={equipmentOpts}
            value={complectation}
            onChange={setComplectation}
            onOptionAdded={(n) => setEquipmentOpts((p) => [...p, n])}
            inputValue={equipmentInput}
            onInputValueChange={setEquipmentInput}
          />
          <NumberField
            label="Орієнтовна ціна"
            value={estPrice}
            onValueChange={(v) => setEstPrice(v)}
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
          <NumberField
            label="Передоплата"
            value={prepayment}
            onValueChange={(v) => setPrepayment(v)}
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

    {prepayDialog && client && (
      <PaymentDialog
        open
        kind="prepayment"
        contactId={client.id}
        ticketId={prepayDialog.ticketId}
        defaultAmount={prepayDialog.amount}
        onClose={() => {
          const { openAfter, ticketId } = prepayDialog;
          setPrepayDialog(null);
          finalize(openAfter, ticketId);
        }}
      />
    )}
    </>
  );
}
