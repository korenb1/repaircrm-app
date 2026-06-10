"use client";
import { useMemo } from "react";
import {
  Checkbox,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { useStatuses } from "@/lib/status-context";
import { DATE_PRESETS } from "@/lib/datePresets";
import { T } from "@/lib/constants";
import type { FilterCriteria } from "@/lib/types";

export interface EntityOption {
  id: string | number;
  name: string;
}

export interface FilterOptions {
  group: EntityOption[];
  brand: EntityOption[];
  model: EntityOption[];
  client: EntityOption[];
  manager: EntityOption[];
  technician: EntityOption[];
}

// Multi-select via checkboxes for one category. OR within the category.
// Uses primitive ids as Select values (no object identity pitfalls).
function CategorySelect<T extends string | number>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: EntityOption[];
  selected: T[];
  onChange: (ids: T[]) => void;
}) {
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        label={label}
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          onChange((typeof v === "string" ? (v.split(",") as unknown) : v) as T[]);
        }}
        renderValue={(sel) => (
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
            {(sel as T[]).map((id) => {
              const o = options.find((x) => x.id === id);
              return o ? <Chip key={String(id)} label={o.name} size="small" /> : null;
            })}
          </Stack>
        )}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}
      >
        {options.map((o) => (
          <MenuItem key={String(o.id)} value={o.id as string | number}>
            <Checkbox checked={selected.includes(o.id as T)} size="small" />
            <ListItemText primary={o.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default function TicketFilterPanel({
  options,
  criteria,
  onChange,
}: {
  options: FilterOptions;
  criteria: FilterCriteria;
  onChange: (next: FilterCriteria) => void;
}) {
  const { statuses } = useStatuses();
  const F = T.workflows.filters;

  const set = <K extends keyof FilterCriteria>(key: K, val: FilterCriteria[K]) =>
    onChange({ ...criteria, [key]: val });

  const statusOptions = useMemo<EntityOption[]>(
    () => statuses.map((s) => ({ id: s.key, name: s.label })),
    [statuses],
  );

  return (
    <Grid container spacing={2} sx={{ py: 2 }}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CategorySelect<string>
          label={F.status}
          options={statusOptions}
          selected={criteria.status ?? []}
          onChange={(v) => set("status", v)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CategorySelect<number>
          label={F.group}
          options={options.group}
          selected={criteria.group ?? []}
          onChange={(v) => set("group", v)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CategorySelect<number>
          label={F.brand}
          options={options.brand}
          selected={criteria.brand ?? []}
          onChange={(v) => set("brand", v)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CategorySelect<number>
          label={F.model}
          options={options.model}
          selected={criteria.model ?? []}
          onChange={(v) => set("model", v)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CategorySelect<number>
          label={F.client}
          options={options.client}
          selected={criteria.client ?? []}
          onChange={(v) => set("client", v)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CategorySelect<string>
          label={F.manager}
          options={options.manager}
          selected={criteria.manager ?? []}
          onChange={(v) => set("manager", v)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <CategorySelect<string>
          label={F.technician}
          options={options.technician}
          selected={criteria.technician ?? []}
          onChange={(v) => set("technician", v)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>{F.created}</InputLabel>
          <Select
            label={F.created}
            value={criteria.created ?? "all"}
            onChange={(e) => set("created", e.target.value)}
          >
            {DATE_PRESETS.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}
