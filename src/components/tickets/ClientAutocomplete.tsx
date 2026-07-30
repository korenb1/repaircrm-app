"use client";
import { useState } from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CreateContactDialog from "@/components/contacts/CreateContactDialog";
import { useT } from "@/lib/i18n/context";
import { phoneMatches } from "@/lib/phone";
import type { Contact } from "@/lib/types";

// Synthetic option that triggers inline contact creation with a prefilled phone.
interface CreateOption {
  __create: true;
  phone: string;
}
type Opt = Contact | CreateOption;
const isCreate = (o: Opt): o is CreateOption => (o as CreateOption).__create === true;

function contactLabel(c: Contact) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return c.phone ? `${name} — ${c.phone}` : name;
}

// Client picker that searches by name OR phone (so 0501234567 matches a stored
// +380501234567). When a typed phone has no match, a "+ КОНТАКТ" option opens
// the create-contact dialog prefilled with that number, then auto-selects it.
export default function ClientAutocomplete({
  contacts,
  value,
  onChange,
  onContactCreated,
  required,
  error,
  helperText,
  disabled,
}: {
  contacts: Contact[];
  value: Contact | null;
  onChange: (c: Contact | null) => void;
  onContactCreated: (c: Contact) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}) {
  const T = useT();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefillPhone, setPrefillPhone] = useState("");

  function openCreate(phone: string) {
    setPrefillPhone(phone);
    setDialogOpen(true);
  }

  return (
    <>
      <Autocomplete<Opt, false, false, false>
        options={contacts}
        value={value}
        disabled={disabled}
        getOptionLabel={(o) => (isCreate(o) ? "" : contactLabel(o))}
        isOptionEqualToValue={(o, v) => !isCreate(o) && !isCreate(v) && o.id === v.id}
        filterOptions={(opts, state) => {
          const raw = state.inputValue.trim();
          if (!raw) return opts;
          const q = raw.toLowerCase();
          const digits = raw.replace(/\D/g, "");
          const isPhoneish = digits.length >= 3;
          const matches = (opts as Contact[]).filter(
            (c) =>
              contactLabel(c).toLowerCase().includes(q) ||
              (isPhoneish && phoneMatches(c.phone, raw)),
          );
          // No existing contact for a typed phone → offer to create one.
          if (isPhoneish && !contacts.some((c) => phoneMatches(c.phone, raw))) {
            return [...matches, { __create: true, phone: raw } as CreateOption];
          }
          return matches;
        }}
        onChange={(_, o) => {
          if (o && isCreate(o)) {
            openCreate(o.phone);
            return;
          }
          onChange((o as Contact) ?? null);
        }}
        renderOption={(props, o) => (
          <Box component="li" {...props} key={isCreate(o) ? "__create" : o.id}>
            {isCreate(o) ? (
              <Typography sx={{ display: "flex", alignItems: "center", fontWeight: 600 }}>
                <AddIcon fontSize="small" sx={{ mr: 0.5 }} /> {T.ticket.general.createContact}
              </Typography>
            ) : (
              contactLabel(o)
            )}
          </Box>
        )}
        renderInput={(p) => (
          <TextField
            {...p}
            label={T.ticket.general.client}
            placeholder={T.ticket.general.clientPlaceholder}
            required={required}
            error={error}
            helperText={helperText}
          />
        )}
      />
      <CreateContactDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        defaultPhone={prefillPhone}
        onCreated={(c) => {
          onContactCreated(c);
          onChange(c);
        }}
      />
    </>
  );
}
