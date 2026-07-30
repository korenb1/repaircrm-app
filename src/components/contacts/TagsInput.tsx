"use client";
import { Autocomplete, Chip, TextField, createFilterOptions } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useT } from "@/lib/i18n/context";

const filter = createFilterOptions<string>();

// Chip-based tag editor. The dropdown surfaces previously-saved tags on focus,
// and typing a new value offers a "save as tag" option that adds it as a chip.
export default function TagsInput({
  value,
  onChange,
  options,
  label,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  options: string[];
  label?: string;
}) {
  const T = useT();
  return (
    <Autocomplete
      multiple
      freeSolo
      disableCloseOnSelect
      options={options}
      value={value}
      onChange={(_, next) => {
        // Normalize: trim, drop empties, strip the "save as" prefix, dedupe.
        const clean = next
          .map((t) => t.replace(/^\+\s*/, "").trim())
          .filter(Boolean);
        onChange(Array.from(new Set(clean)));
      }}
      filterOptions={(opts, params) => {
        const filtered = filter(opts, params);
        const input = params.inputValue.trim();
        // Offer to save the typed text as a new tag when it isn't an exact match.
        if (input && !opts.some((o) => o.toLowerCase() === input.toLowerCase())) {
          filtered.push(`+ ${input}`);
        }
        return filtered;
      }}
      renderValue={(tags, getItemProps) =>
        tags.map((tag, index) => {
          const { key, ...rest } = getItemProps({ index });
          return <Chip key={key} label={tag} size="small" {...rest} />;
        })
      }
      slotProps={{
        listbox: {
          sx: { display: "flex", flexWrap: "wrap", gap: 0.5, p: 1 },
        },
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props as { key: string } & Record<string, unknown>;
        const create = option.startsWith("+ ");
        return (
          <li key={key} {...rest} style={{ width: "auto", padding: 0 }}>
            <Chip
              label={create ? option.slice(2).trim() : option}
              size="small"
              variant={create ? "filled" : "outlined"}
              color={create ? "primary" : "default"}
              icon={create ? <AddIcon /> : undefined}
            />
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label ?? T.contacts.fields.tags} placeholder={T.contacts.fields.addTag} fullWidth />
      )}
    />
  );
}
