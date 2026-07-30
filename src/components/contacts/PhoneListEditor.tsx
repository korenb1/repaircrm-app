"use client";
import { useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Radio,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import StarIcon from "@mui/icons-material/Star";
import type { CountryCode } from "libphonenumber-js";
import { COUNTRIES, DEFAULT_COUNTRY, countryByIso, validatePhone } from "@/lib/phone";
import { useT } from "@/lib/i18n/context";



// A draft phone row used by the create dialog and the general tab. The number
// is held as the national (local) part; `country` selects the calling code.
export interface PhoneDraft {
  phone: string;
  country: CountryCode;
  label: string;
  is_primary: boolean;
}

export const emptyPhone = (): PhoneDraft => ({
  phone: "",
  country: DEFAULT_COUNTRY,
  label: "",
  is_primary: false,
});

// A row is valid when empty (ignored on save) or a well-formed number.
export const isPhoneDraftValid = (p: PhoneDraft) =>
  !p.phone.trim() || validatePhone(p.phone, p.country);

// Flag + calling-code button that opens a searchable country menu listing full
// country names (e.g. "Україна"), rendered inside the number field's adornment.
function CountrySelect({
  iso,
  onChange,
}: {
  iso: CountryCode;
  onChange: (iso: CountryCode) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const T = useT();
  const current = countryByIso(iso) ?? COUNTRIES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q) ||
        c.code.includes(q),
    );
  }, [query]);

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ display: "flex", alignItems: "center", gap: 0.25, pr: 0.5 }}
      >
        <span style={{ fontSize: 18 }}>{current.flag}</span>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          +{current.code}
        </Typography>
        <ArrowDropDownIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => {
          setAnchor(null);
          setQuery("");
        }}
        slotProps={{ paper: { sx: { maxHeight: 360, width: 320 } } }}
      >
        <Box sx={{ px: 1, pb: 1 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={T.contacts.fields.searchCountry}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </Box>
        {filtered.map((c) => (
          <MenuItem
            key={c.iso}
            selected={c.iso === iso}
            onClick={() => {
              onChange(c.iso);
              setAnchor(null);
              setQuery("");
            }}
          >
            <span style={{ fontSize: 18, marginRight: 8 }}>{c.flag}</span>
            <span style={{ flex: 1 }}>{c.name}</span>
            <Typography variant="body2" sx={{ color: "text.secondary", ml: 1 }}>
              +{c.code}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Controlled editor for a contact's list of phone numbers. The country is a
// flag picker inside the single phone field. The "primary" radio is mutually
// exclusive; deleting the primary promotes the first row.
export default function PhoneListEditor({
  value,
  onChange,
  showRequired,
}: {
  value: PhoneDraft[];
  onChange: (next: PhoneDraft[]) => void;
  showRequired?: boolean;
}) {
  const T = useT();
  function update(i: number, patch: Partial<PhoneDraft>) {
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function setPrimary(i: number) {
    onChange(value.map((p, idx) => ({ ...p, is_primary: idx === i })));
  }

  function remove(i: number) {
    const next = value.filter((_, idx) => idx !== i);
    // ensure exactly one primary remains when rows exist
    if (next.length && !next.some((p) => p.is_primary)) next[0].is_primary = true;
    onChange(next);
  }

  function add() {
    const next = [...value, emptyPhone()];
    if (next.length === 1) next[0].is_primary = true;
    onChange(next);
  }

  return (
    <Stack spacing={1.5}>
      {value.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {T.contacts.fields.noPhones}
        </Typography>
      )}
      {value.map((p, i) => {
        const badFormat = !!p.phone.trim() && !validatePhone(p.phone, p.country);
        const emptyRequired = !!showRequired && p.is_primary && !p.phone.trim();
        const error = badFormat || emptyRequired;
        const helper = badFormat ? T.contacts.fields.invalidPhone : emptyRequired ? T.common.fillRequired : undefined;
        return (
          <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <Tooltip title={T.contacts.fields.primaryPhone}>
              <Radio
                size="small"
                checked={p.is_primary}
                onChange={() => setPrimary(i)}
                icon={<StarIcon fontSize="small" sx={{ color: "#ccc" }} />}
                checkedIcon={<StarIcon fontSize="small" sx={{ color: "#f5a623" }} />}
                sx={{ p: 0.5, mt: 1 }}
              />
            </Tooltip>
            <TextField
              label={T.contacts.cols.phone}
              value={p.phone}
              onChange={(e) => update(i, { phone: e.target.value })}
              placeholder="50 123 45 67"
              size="small"
              required={p.is_primary}
              error={error}
              helperText={helper}
              sx={{ flex: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CountrySelect
                        iso={p.country}
                        onChange={(iso) => update(i, { country: iso })}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label={T.contacts.fields.phoneLabel}
              value={p.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder={T.contacts.fields.phoneLabelPlaceholder}
              size="small"
              sx={{ flex: 1 }}
            />
            <IconButton onClick={() => remove(i)} size="small" sx={{ mt: 0.5 }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      })}
      <Box>
        <Button startIcon={<AddIcon />} size="small" onClick={add}>
          {T.contacts.fields.addPhone}
        </Button>
      </Box>
    </Stack>
  );
}
