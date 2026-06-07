"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid, TextField, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import PhoneListEditor, { type PhoneDraft } from "@/components/contacts/PhoneListEditor";
import { splitStored, toE164 } from "@/lib/phone";
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
  const [discountService, setDiscountService] = useState(String(contact.discount_service ?? 0));
  const [discountGoods, setDiscountGoods] = useState(String(contact.discount_goods ?? 0));
  const [note, setNote] = useState(contact.note ?? "");
  const [tags, setTags] = useState((contact.tags ?? []).join(", "));

  async function save() {
    await supabase
      .from("contacts")
      .update({
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        address: address || null,
        discount_card: discountCard || null,
        discount_service: Number(discountService) || 0,
        discount_goods: Number(discountGoods) || 0,
        note: note || null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
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
          <TextField label="Ім'я" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Прізвище" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        </Grid>
        <Grid size={12}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
            Телефони
          </Typography>
          <PhoneListEditor value={phoneList} onChange={setPhoneList} />
        </Grid>
        <Grid size={12}>
          <TextField label="Адреса" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField label="Дисконтна картка" value={discountCard} onChange={(e) => setDiscountCard(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <TextField label="Знижка на послуги, %" type="number" value={discountService} onChange={(e) => setDiscountService(e.target.value)} fullWidth />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <TextField label="Знижка на товари, %" type="number" value={discountGoods} onChange={(e) => setDiscountGoods(e.target.value)} fullWidth />
        </Grid>
        <Grid size={12}>
          <TextField label="Нотатка" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />
        </Grid>
        <Grid size={12}>
          <TextField label="Теги (через кому)" value={tags} onChange={(e) => setTags(e.target.value)} fullWidth />
        </Grid>
      </Grid>
  );
}
