"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import NumberField from "@/components/NumberField";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { useT } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { parseEntries, formatEntries, mergePending } from "@/lib/directory";
import UserAvatar from "@/components/ui/UserAvatar";
import ClientAutocomplete from "@/components/tickets/ClientAutocomplete";
import SnImeiField from "@/components/tickets/SnImeiField";
import DirectoryMultiSelect from "@/components/tickets/DirectoryMultiSelect";
import CascadingDeviceSelect, {
  type DeviceSelection,
  resolveDeviceSelection,
} from "@/components/tickets/CascadingDeviceSelect";
import type { Contact, DeviceRow, Profile, TicketRow } from "@/lib/types";

type ClientLite = Pick<Contact, "id" | "first_name" | "last_name" | "phone">;

function clientName(c: ClientLite) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}


export default function GeneralTab({
  ticket,
  profiles,
  registerSave,
  locked = false,
}: {
  ticket: TicketRow;
  profiles: Profile[];
  registerSave?: (fn: (() => Promise<void>) | null) => void;
  locked?: boolean;
}) {
  const T = useT();
  const router = useRouter();
  const supabase = createClient();

  const [manager, setManager] = useState<Profile | null>(
    profiles.find((p) => p.id === ticket.manager_id) ?? null,
  );
  const [technician, setTechnician] = useState<Profile | null>(
    profiles.find((p) => p.id === ticket.technician_id) ?? null,
  );
  const [clientId, setClientId] = useState<number | null>(
    ticket.client_id ?? null,
  );
  const [clientInfo, setClientInfo] = useState<ClientLite | null>(
    ticket.client ?? null,
  );
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [device, setDevice] = useState<DeviceSelection>({
    group_id: ticket.group_id,
    group_name: ticket.group?.name ?? "",
    brand_id: ticket.brand_id,
    brand_name: ticket.brand?.name ?? "",
    model_id: ticket.model_id,
    model_name: ticket.model?.name ?? "",
    modification_id: ticket.modification_id,
    modification_name: ticket.modification?.name ?? "",
  });
  const [snImei, setSnImei] = useState(ticket.sn_imei ?? "");
  const [deviceState, setDeviceState] = useState(ticket.device_state ?? "");
  const [malfunction, setMalfunction] = useState<string[]>(parseEntries(ticket.malfunction));
  const [malfunctionInput, setMalfunctionInput] = useState("");
  const [complectation, setComplectation] = useState<string[]>(parseEntries(ticket.complectation));
  const [equipmentInput, setEquipmentInput] = useState("");
  const [malfunctionOpts, setMalfunctionOpts] = useState<string[]>([]);
  const [equipmentOpts, setEquipmentOpts] = useState<string[]>([]);
  const [estPrice, setEstPrice] = useState<number | null>(ticket.est_price ?? 0);
  const [dueDate, setDueDate] = useState<Dayjs | null>(
    ticket.due_date ? dayjs(ticket.due_date) : null,
  );
  const [urgent, setUrgent] = useState(ticket.urgent);
  const [managerNotes, setManagerNotes] = useState(ticket.manager_notes ?? "");
  const [attempted, setAttempted] = useState(false);

  // Contacts are only needed for the picker that appears once a client is
  // removed; load them lazily so the tab stays light when a client is set.
  useEffect(() => {
    if (clientId !== null || contacts.length > 0) return;
    supabase
      .from("contacts")
      .select("*")
      .order("first_name")
      .then(({ data }) => setContacts(data ?? []));
  }, [clientId, contacts.length]);

  // Load the directory option lists for the malfunction / equipment chip
  // autocompletes (free text is still allowed on top of these).
  useEffect(() => {
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
  }, []);

  // Apply an existing device picked from the SN/IMEI search: autofill catalog.
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
  }

  // Mandatory: manager, technician, client, group, model, SN/IMEI, malfunction.
  const valid =
    !!manager &&
    !!technician &&
    !!clientId &&
    !!device.group_name.trim() &&
    !!device.model_name.trim() &&
    !!snImei.trim() &&
    mergePending(malfunction, malfunctionInput).length > 0;

  async function save() {
    if (!valid) {
      setAttempted(true);
      return;
    }
    const ids = await resolveDeviceSelection(supabase, device);
    await supabase
      .from("tickets")
      .update({
        manager_id: manager?.id ?? null,
        technician_id: technician?.id ?? null,
        client_id: clientId,
        group_id: ids.group_id,
        brand_id: ids.brand_id,
        model_id: ids.model_id,
        modification_id: ids.modification_id,
        sn_imei: snImei.trim() || null,
        device_state: deviceState || null,
        malfunction: formatEntries(mergePending(malfunction, malfunctionInput)) || null,
        complectation: formatEntries(mergePending(complectation, equipmentInput)) || null,
        est_price: estPrice ?? 0,
        due_date: dueDate ? dueDate.toISOString() : null,
        urgent,
        manager_notes: managerNotes || null,
      })
      .eq("id", ticket.id);
    router.refresh();
  }

  // Register this tab's save handler with the parent's shared SAVE button.
  // A locked (closed) ticket exposes no editable fields here, so it registers
  // nothing and the SAVE button stays hidden while this tab is open.
  useEffect(() => {
    if (locked) {
      registerSave?.(null);
      return;
    }
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
            disabled={locked}
            onChange={(_, o) => setManager(o)}
            renderOption={(props, o) => {
              const { key, ...rest } = props;
              return (
                <Box
                  component="li"
                  key={key}
                  {...rest}
                  sx={{ display: "flex", gap: 1 }}
                >
                  <UserAvatar name={o.full_name} avatarPath={o.avatar_path} size={24} />
                  {o.full_name}
                </Box>
              );
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label={T.ticket.general.manager}
                required
                error={attempted && !manager}
                helperText={attempted && !manager ? T.common.fillRequired : undefined}
                slotProps={{
                  ...p.slotProps,
                  input: {
                    ...p.slotProps.input,
                    startAdornment: manager ? (
                      <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
                        <UserAvatar
                          name={manager.full_name}
                          avatarPath={manager.avatar_path}
                          size={24}
                        />
                      </Box>
                    ) : (
                      p.slotProps.input.startAdornment
                    ),
                  },
                }}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            options={profiles}
            getOptionLabel={(o) => o.full_name}
            value={technician}
            disabled={locked}
            onChange={(_, o) => setTechnician(o)}
            renderOption={(props, o) => {
              const { key, ...rest } = props;
              return (
                <Box
                  component="li"
                  key={key}
                  {...rest}
                  sx={{ display: "flex", gap: 1 }}
                >
                  <UserAvatar name={o.full_name} avatarPath={o.avatar_path} size={24} />
                  {o.full_name}
                </Box>
              );
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label={T.ticket.general.technician}
                required
                error={attempted && !technician}
                helperText={attempted && !technician ? T.common.fillRequired : undefined}
                slotProps={{
                  ...p.slotProps,
                  input: {
                    ...p.slotProps.input,
                    startAdornment: technician ? (
                      <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
                        <UserAvatar
                          name={technician.full_name}
                          avatarPath={technician.avatar_path}
                          size={24}
                        />
                      </Box>
                    ) : (
                      p.slotProps.input.startAdornment
                    ),
                  },
                }}
              />
            )}
          />
        </Grid>
        <Grid size={12}>
          {clientInfo ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                px: 1.5,
                py: 1,
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Link
                  href={`/contacts/${clientInfo.id}`}
                  style={{ color: "#1976d2", textDecoration: "none", fontWeight: 600 }}
                >
                  {clientName(clientInfo) || "—"}
                </Link>
                {clientInfo.phone && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {clientInfo.phone}
                  </Typography>
                )}
              </Box>
              <Tooltip title={T.ticket.general.deleteClient}>
                <IconButton
                  size="small"
                  disabled={locked}
                  onClick={() => {
                    setClientInfo(null);
                    setClientId(null);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <ClientAutocomplete
              contacts={contacts}
              value={null}
              disabled={locked}
              onChange={(c) => {
                if (c) {
                  setClientId(c.id);
                  setClientInfo(c);
                }
              }}
              onContactCreated={(c) =>
                setContacts((prev) =>
                  prev.some((x) => x.id === c.id) ? prev : [...prev, c],
                )
              }
              required
              error={attempted && !clientId}
              helperText={attempted && !clientId ? T.common.fillRequired : undefined}
            />
          )}
        </Grid>
        <Grid size={12}>
          <SnImeiField
            value={snImei}
            onChange={setSnImei}
            onSelectDevice={applyDevice}
            disabled={locked}
            required
            error={attempted && !snImei.trim()}
            helperText={attempted && !snImei.trim() ? T.common.fillRequired : undefined}
          />
        </Grid>
        <Grid size={12}>
          <CascadingDeviceSelect
            value={device}
            onChange={setDevice}
            showErrors={attempted}
            disabled={locked}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label={T.ticket.general.deviceState}
            value={deviceState}
            onChange={(e) => setDeviceState(e.target.value)}
            disabled={locked}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
        <Grid size={12}>
          <DirectoryMultiSelect
            label={T.ticket.general.malfunction}
            table="malfunctions"
            options={malfunctionOpts}
            value={malfunction}
            disabled={locked}
            onChange={setMalfunction}
            onOptionAdded={(n) => setMalfunctionOpts((p) => [...p, n])}
            inputValue={malfunctionInput}
            onInputValueChange={setMalfunctionInput}
            required
            error={attempted && mergePending(malfunction, malfunctionInput).length === 0}
            helperText={
              attempted && mergePending(malfunction, malfunctionInput).length === 0
                ? T.common.fillRequired
                : undefined
            }
          />
        </Grid>
        <Grid size={12}>
          <DirectoryMultiSelect
            label={T.ticket.general.complectation}
            table="equipment_items"
            options={equipmentOpts}
            value={complectation}
            disabled={locked}
            onChange={setComplectation}
            onOptionAdded={(n) => setEquipmentOpts((p) => [...p, n])}
            inputValue={equipmentInput}
            onInputValueChange={setEquipmentInput}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberField
            label={T.ticket.general.estPrice}
            value={estPrice}
            onValueChange={(v) => setEstPrice(v)}
            disabled={locked}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <DateTimePicker
            label={T.ticket.general.due}
            value={dueDate}
            onChange={(v) => setDueDate(v)}
            disabled={locked}
            format="DD.MM.YYYY HH:mm"
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={urgent}
                disabled={locked}
                onChange={(e) => setUrgent(e.target.checked)}
              />
            }
            label={T.ticket.general.urgent}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label={T.ticket.general.managerNotes}
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            disabled={locked}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
      </Grid>
  );
}
