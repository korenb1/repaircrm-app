"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid, TextField, Typography } from "@mui/material";
import NumberField from "@/components/NumberField";
import TagsInput from "@/components/contacts/TagsInput";
import { createClient } from "@/lib/supabase/client";
import PhoneListEditor, {
  type PhoneDraft,
  isPhoneDraftValid,
} from "@/components/contacts/PhoneListEditor";
import { splitStored, toE164, validatePhone } from "@/lib/phone";
import { useT } from "@/lib/i18n/context";
import type { Contact, ContactPhone } from "@/lib/types";



export default function GeneralTab({
  contact,
  phones,
  registerSave,
}: {
  contact: Contact;
  phones: ContactPhone[];
  registerSave?: (fn: (() => Promise<void>) | null) => void;
}) {
  const router = useRouter();
  const T = useT();
  const supabase = createClient();

  const [firstName, setFirstName] = useState(contact.first_name);
  const [lastName, setLastName] = useState(contact.last_name ?? "");
  const [phoneList, setPhoneList] = useState<PhoneDraft[]>(
    phones.map((p) => {
      const { country, national } = splitStored(p.phone);
      return { phone: national, country, label: p.label ?? "", is_primary: p.is_primary };
    }),
  );
  const [email, setEmail] = useState(contact.email ?? "");
  const [address, setAddress] = useState(contact.address ?? "");
  const [discountCard, setDiscountCard] = useState(contact.discount_card ?? "");
  const [discountService, setDiscountService] = useState<number | null>(contact.discount_service ?? 0);
  const [discountGoods, setDiscountGoods] = useState<number | null>(contact.discount_goods ?? 0);
  const [note, setNote] = useState(contact.note ?? "");
  const [tags, setTags] = useState<string[]>(contact.tags ?? []);
  const [tagOptions, setTagOptions] = useState<string[]>(contact.tags ?? []);
  const [attempted, setAttempted] = useState(false);

  // Load the set of tags already used across all contacts to suggest on focus.
  useEffect(() => {
    supabase
      .from("contacts")
      .select("tags")
      .then(({ data }) => {
        const all = (data ?? []).flatMap((r) => r.tags ?? []);
        setTagOptions(Array.from(new Set(all)).sort());
      });
  }, []);

  // First name and at least one valid phone are mandatory.
  const phoneValid =
    phoneList.some((p) => p.phone.trim() && validatePhone(p.phone, p.country)) &&
    phoneList.every(isPhoneDraftValid);
  const valid = !!firstName.trim() && phoneValid;

  async function save() {
    if (!valid) {
      setAttempted(true);
      return;
    }
    await supabase
      .from("contacts")
      .update({
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
      .eq("id", contact.id);

    // Reconcile phones: replace the whole set. The DB trigger then mirrors
    // the primary number back into contacts.phone for denormalized readers.
    const rows = phoneList
      .filter((p) => p.phone.trim())
      .map((p, i) => ({
        contact_id: contact.id,
        phone: toE164(p.phone, p.country),
        label: p.label.trim() || null,
        is_primary: p.is_primary,
        sort_order: i,
      }));
    if (rows.length && !rows.some((r) => r.is_primary)) rows[0].is_primary = true;
    await supabase.from("contact_phones").delete().eq("contact_id", contact.id);
    if (rows.length) await supabase.from("contact_phones").insert(rows);

    router.refresh();
  }

  // Register this tab's save handler with the parent's shared SAVE button.
  useEffect(() => {
    registerSave?.(save);
    return () => registerSave?.(null);
  });

  return (
    <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label={T.contacts.fields.firstName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            required
            error={attempted && !firstName.trim()}
            helperText={attempted && !firstName.trim() ? T.common.fillRequired : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label={T.contacts.fields.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label={T.contacts.fields.email} value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        </Grid>
        <Grid size={12}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
            {T.contacts.fields.phones}
          </Typography>
          <PhoneListEditor value={phoneList} onChange={setPhoneList} showRequired={attempted} />
        </Grid>
        <Grid size={12}>
          <TextField label={T.contacts.fields.address} value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField label={T.contacts.fields.discountCard} value={discountCard} onChange={(e) => setDiscountCard(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <NumberField label={T.contacts.fields.serviceDiscount} value={discountService} onValueChange={(v) => setDiscountService(v)} min={0} max={100} fullWidth />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <NumberField label={T.contacts.fields.productDiscount} value={discountGoods} onValueChange={(v) => setDiscountGoods(v)} min={0} max={100} fullWidth />
        </Grid>
        <Grid size={12}>
          <TextField label={T.contacts.fields.note} value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />
        </Grid>
        <Grid size={12}>
          <TagsInput value={tags} onChange={setTags} options={tagOptions} />
        </Grid>
      </Grid>
  );
}
