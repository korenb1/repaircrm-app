"use client";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { createClient } from "@/lib/supabase/client";

// Synthetic dropdown option that creates a new directory entry from typed text.
interface CreateOption {
  __create: true;
  name: string;
}
type Opt = string | CreateOption;
const isCreate = (o: Opt): o is CreateOption =>
  typeof o === "object" && (o as CreateOption).__create === true;

// Multi-select over a flat directory table (malfunctions / equipment_items).
// Typed free text is accepted as a value on Enter/blur WITHOUT touching the
// directory. To persist a new entry to the directory (so it's reusable later),
// pick the "+ {label} «text»" option, which inserts the row first. Selected
// values render as comma-separated text.
export default function DirectoryMultiSelect({
  label,
  table,
  options,
  value,
  onChange,
  onOptionAdded,
  inputValue,
  onInputValueChange,
  required,
  error,
  helperText,
  disabled,
}: {
  label: string;
  table: "malfunctions" | "equipment_items";
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  onOptionAdded: (name: string) => void;
  inputValue: string;
  onInputValueChange: (s: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}) {
  const supabase = createClient();

  function addValue(name: string) {
    const t = name.trim();
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
  }

  async function handleChange(vals: Opt[]) {
    const create = vals.find(isCreate);
    if (create) {
      const name = create.name.trim();
      onInputValueChange("");
      if (!name || value.some((v) => v.toLowerCase() === name.toLowerCase())) return;
      await supabase.from(table).insert({ name });
      onOptionAdded(name);
      onChange([...value, name]);
      return;
    }
    onInputValueChange("");
    onChange((vals as string[]).map((v) => v.trim()).filter(Boolean));
  }

  return (
    <Autocomplete<Opt, true, false, true>
      multiple
      freeSolo
      options={options}
      value={value}
      inputValue={inputValue}
      disabled={disabled}
      getOptionLabel={(o) => (isCreate(o) ? "" : o)}
      isOptionEqualToValue={(o, v) => !isCreate(o) && !isCreate(v) && o === v}
      onInputChange={(_, v) => onInputValueChange(v)}
      onBlur={() => {
        // Commit whatever was typed but not yet entered so switching fields
        // doesn't discard it.
        addValue(inputValue);
        onInputValueChange("");
      }}
      filterOptions={(opts, state) => {
        const raw = state.inputValue.trim();
        const q = raw.toLowerCase();
        const base = (opts as Opt[]).filter(
          (o) => !isCreate(o) && o.toLowerCase().includes(q),
        );
        const exists =
          options.some((o) => o.toLowerCase() === q) ||
          value.some((v) => v.toLowerCase() === q);
        if (raw && !exists) {
          return [...base, { __create: true, name: raw } as CreateOption];
        }
        return base;
      }}
      onChange={(_, vals) => handleChange(vals as Opt[])}
      renderValue={(vals) => (vals as string[]).join(", ")}
      renderOption={(props, o) => {
        const { key: _key, ...rest } = props as { key?: string };
        return (
          <Box component="li" key={isCreate(o) ? "__create" : o} {...rest}>
            {isCreate(o) ? (
              <Typography sx={{ display: "flex", alignItems: "center", fontWeight: 600 }}>
                <AddIcon fontSize="small" sx={{ mr: 0.5 }} /> {label} «{o.name}»
              </Typography>
            ) : (
              o
            )}
          </Box>
        );
      }}
      renderInput={(p) => (
        <TextField
          {...p}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
        />
      )}
    />
  );
}
