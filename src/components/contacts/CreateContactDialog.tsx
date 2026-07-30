"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import NumberField from "@/components/NumberField";
import TagsInput from "@/components/contacts/TagsInput";
import CloseIcon from "@mui/icons-material/Close";
import { createClient } from "@/lib/supabase/client";
import PhoneListEditor, {
  type PhoneDraft,
  emptyPhone,
  isPhoneDraftValid,
} from "@/components/contacts/PhoneListEditor";
import { splitStored, toE164, validatePhone } from "@/lib/phone";
import { useT } from "@/lib/i18n/context";
import type { Contact } from "@/lib/types";

// Build the initial phone list, optionally prefilled with a number passed in
// from another flow (e.g. the ticket dialog's "+ КОНТАКТ"). The number is split
// into country + national parts (a trunk "0" / country code is dropped from the
// national part since the country selector carries the prefix).
function initialPhones(defaultPhone?: string): PhoneDraft[] {
  const row = { ...emptyPhone(), is_primary: true };
  if (defaultPhone) {
    const { country, national } = splitStored(defaultPhone);
    row.country = country;
    row.phone = national;
  }
  return [row];
}

export default function CreateContactDialog({
  open,
  onClose,
  defaultType = "person",
  defaultPhone,
  onCreated,
  tagOptions = [],
}: {
  open: boolean;
  onClose: () => void;
  defaultType?: "person" | "organization";
  defaultPhone?: string;
  onCreated?: (contact: Contact) => void;
  tagOptions?: string[];
}) {
  const T = useT();
  const router = useRouter();
  const supabase = createClient();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [type, setType] = useState<"person" | "organization">(defaultType);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneList, setPhoneList] = useState<PhoneDraft[]>(initialPhones(defaultPhone));
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [discountCard, setDiscountCard] = useState("");
  const [discountService, setDiscountService] = useState<number | null>(0);
  const [discountGoods, setDiscountGoods] = useState<number | null>(0);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // When the dialog is (re)opened with a prefilled number, seed the phone row.
  useEffect(() => {
    if (open && defaultPhone) setPhoneList(initialPhones(defaultPhone));
  }, [open, defaultPhone]);

  function reset() {
    setFirstName("");
    setLastName("");
    setPhoneList(initialPhones());
    setEmail("");
    setAddress("");
    setDiscountCard("");
    setDiscountService(0);
    setDiscountGoods(0);
    setNote("");
    setTags([]);
    setAttempted(false);
  }

  // Phone is mandatory: need at least one valid number, and no invalid rows.
  const phoneValid =
    phoneList.some((p) => p.phone.trim() && validatePhone(p.phone, p.country)) &&
    phoneList.every(isPhoneDraftValid);
  const canSubmit = !!firstName.trim() && phoneValid;

  async function submit() {
    if (!canSubmit) {
      setAttempted(true);
      return;
    }
    setSaving(true);
    const { data: created } = await supabase
      .from("contacts")
      .insert({
        type,
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        address: address || null,
        discount_card: discountCard || null,
        discount_service: discountService ?? 0,
        discount_goods: discountGoods ?? 0,
        note: note || null,
        tags,
      })
      .select("id")
      .single();

    // Insert phone rows; the DB trigger mirrors the primary into contacts.phone.
    if (created) {
      const rows = phoneList
        .filter((p) => p.phone.trim())
        .map((p, i) => ({
          contact_id: created.id,
          phone: toE164(p.phone, p.country),
          label: p.label.trim() || null,
          is_primary: p.is_primary,
          sort_order: i,
        }));
      if (rows.length && !rows.some((r) => r.is_primary)) rows[0].is_primary = true;
      if (rows.length) await supabase.from("contact_phones").insert(rows);
    }

    // Hand the freshly created contact back to the caller (e.g. auto-select it
    // as the ticket's client). Re-read so the mirrored phone is included.
    if (created && onCreated) {
      const { data: full } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", created.id)
        .single();
      if (full) onCreated(full as Contact);
    }

    setSaving(false);
    reset();
    onClose();
    router.refresh();
  }

  // Clear the form on any dismissal so a fresh open starts empty.
  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        {T.contacts.create.newContact}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <RadioGroup
            row
            value={type}
            onChange={(_, v) => setType(v as "person" | "organization")}
          >
            <FormControlLabel value="person" control={<Radio />} label={T.contacts.create.person} />
            <FormControlLabel
              value="organization"
              control={<Radio />}
              label={T.contacts.create.organization}
            />
          </RadioGroup>

          <Divider textAlign="left">
            <Typography variant="subtitle2">{T.contacts.create.contactDetails}</Typography>
          </Divider>

          <TextField
            label={T.contacts.fields.firstName}
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            error={attempted && !firstName.trim()}
            helperText={attempted && !firstName.trim() ? T.common.fillRequired : undefined}
          />
          <TextField
            label={T.contacts.fields.lastName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
          <PhoneListEditor value={phoneList} onChange={setPhoneList} showRequired={attempted} />
          <TextField
            label={T.contacts.fields.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label={T.contacts.fields.address}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
          />

          <Divider textAlign="left">
            <Typography variant="subtitle2">{T.contacts.create.discounts}</Typography>
          </Divider>

          <TextField
            label={T.contacts.fields.discountCard}
            value={discountCard}
            onChange={(e) => setDiscountCard(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <NumberField
              label={T.contacts.fields.serviceDiscount}
              value={discountService}
              onValueChange={(v) => setDiscountService(v)}
              min={0}
              max={100}
              fullWidth
            />
            <NumberField
              label={T.contacts.fields.productDiscount}
              value={discountGoods}
              onValueChange={(v) => setDiscountGoods(v)}
              min={0}
              max={100}
              fullWidth
            />
          </Stack>

          <Divider textAlign="left">
            <Typography variant="subtitle2">{T.contacts.create.other}</Typography>
          </Divider>

          <TextField
            label={T.contacts.fields.note}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TagsInput value={tags} onChange={setTags} options={tagOptions} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{T.common.cancel}</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {T.common.create}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
