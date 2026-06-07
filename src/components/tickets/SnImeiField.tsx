"use client";
import { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { createClient } from "@/lib/supabase/client";
import type { DeviceRow } from "@/lib/types";

const DEVICE_SELECT =
  "*, group:groups(name), brand:brands(name), model:models(name), modification:modifications(name), client:contacts(*)";

function deviceSummary(d: DeviceRow) {
  const parts = [d.group?.name, d.brand?.name, d.model?.name, d.modification?.name].filter(Boolean);
  const who = d.client
    ? [d.client.first_name, d.client.last_name].filter(Boolean).join(" ")
    : null;
  return [parts.join(" "), who].filter(Boolean).join(" · ");
}

// Searchable SN/IMEI input. Picking an existing device fires onSelectDevice so
// the parent can autofill the catalog + client. The generate button mints the
// next 6-digit serial (000001, 000002, …) via the next_device_sn() RPC.
export default function SnImeiField({
  value,
  onChange,
  onSelectDevice,
  required,
  error,
  helperText,
}: {
  value: string;
  onChange: (sn: string) => void;
  onSelectDevice: (d: DeviceRow) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}) {
  const supabase = createClient();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase
      .from("devices")
      .select(DEVICE_SELECT)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDevices((data as DeviceRow[] | null) ?? []));
  }, [supabase]);

  async function generate() {
    setGenerating(true);
    const { data } = await supabase.rpc("next_device_sn");
    if (typeof data === "string") onChange(data);
    setGenerating(false);
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
      <Autocomplete<DeviceRow, false, false, true>
        freeSolo
        fullWidth
        options={devices}
        filterOptions={(opts, state) => {
          const q = state.inputValue.trim().toLowerCase();
          if (!q) return opts;
          return opts.filter((o) => o.sn_imei.toLowerCase().includes(q));
        }}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.sn_imei)}
        inputValue={value}
        onInputChange={(_, text, reason) => {
          if (reason === "reset") return;
          onChange(text);
        }}
        onChange={(_, o) => {
          if (o && typeof o !== "string") {
            onChange(o.sn_imei);
            onSelectDevice(o);
          }
        }}
        renderOption={(props, o) => (
          <Box component="li" {...props} key={o.id}>
            <Box>
              <Typography variant="body2">{o.sn_imei}</Typography>
              {deviceSummary(o) && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {deviceSummary(o)}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        renderInput={(p) => (
          <TextField
            {...p}
            label="Серійний номер / IMEI"
            required={required}
            error={error}
            helperText={helperText}
          />
        )}
      />
      <Tooltip title="Згенерувати номер">
        <span>
          <IconButton onClick={generate} disabled={generating} sx={{ mt: 1 }}>
            <AutorenewIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
