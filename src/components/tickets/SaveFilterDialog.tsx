"use client";
import { useState } from "react";
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
  Typography,
} from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { FILTER_ICON_KEYS, filterIcon } from "@/lib/filterIcons";
import { T } from "@/lib/constants";
import type { FilterCriteria, TicketFilter } from "@/lib/types";

export default function SaveFilterDialog({
  open,
  onClose,
  criteria,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  criteria: FilterCriteria;
  onSaved: (filter: TicketFilter) => void;
}) {
  const supabase = createClient();
  const F = T.workflows.filters;

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(FILTER_ICON_KEYS[0]);
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);

  const PreviewIcon = filterIcon(icon);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("ticket_filters")
      .insert({ name: name.trim(), icon, is_shared: shared, criteria })
      .select("*")
      .single();
    setSaving(false);
    if (data) {
      onSaved(data as TicketFilter);
      setName("");
      setIcon(FILTER_ICON_KEYS[0]);
      setShared(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{F.create}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={F.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                    <PreviewIcon fontSize="small" />
                  </Box>
                ),
              },
            }}
          />

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {F.icon}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {FILTER_ICON_KEYS.map((key) => {
                const Icon = filterIcon(key);
                const active = key === icon;
                return (
                  <IconButton
                    key={key}
                    size="small"
                    onClick={() => setIcon(key)}
                    sx={{
                      border: "1px solid",
                      borderColor: active ? "primary.main" : "divider",
                      color: active ? "primary.main" : "text.secondary",
                      bgcolor: active ? "action.selected" : "transparent",
                    }}
                  >
                    <Icon fontSize="small" />
                  </IconButton>
                );
              })}
            </Stack>
          </Box>

          <FormControlLabel
            control={
              <Checkbox checked={shared} onChange={(e) => setShared(e.target.checked)} />
            }
            label={F.shareWithOthers}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{F.cancel}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !name.trim()}>
          {F.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
