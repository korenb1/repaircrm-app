"use client";
import {
  Box,
  Button,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DATE_PRESETS } from "@/lib/datePresets";
import { T } from "@/lib/constants";
import type { FinanceCategory } from "@/lib/types";

export interface TxFilter {
  period: string;
  categoryId: number | null;
}

export default function TransactionFilterPanel({
  anchorEl,
  value,
  categories,
  onChange,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  value: TxFilter;
  categories: FinanceCategory[];
  onChange: (f: TxFilter) => void;
  onClose: () => void;
}) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Box sx={{ p: 2, width: 280 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {T.finances.filterPanel.title}
        </Typography>
        <Stack spacing={2}>
          <TextField
            select
            size="small"
            label={T.finances.filterPanel.period}
            value={value.period}
            onChange={(e) => onChange({ ...value, period: e.target.value })}
            fullWidth
          >
            {DATE_PRESETS.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={T.finances.filterPanel.category}
            value={value.categoryId ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                categoryId: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            fullWidth
          >
            <MenuItem value="">{T.finances.filterPanel.allCategories}</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button
              size="small"
              onClick={() => onChange({ period: "all", categoryId: null })}
            >
              {T.finances.filterPanel.reset}
            </Button>
            <Button size="small" variant="contained" onClick={onClose}>
              {T.finances.filterPanel.apply}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Popover>
  );
}
