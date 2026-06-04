"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Grid, Stack, TextField } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type { Contact } from "@/lib/types";

export default function GeneralTab({ contact }: { contact: Contact }) {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState(contact.first_name);
  const [lastName, setLastName] = useState(contact.last_name ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [address, setAddress] = useState(contact.address ?? "");
  const [discountCard, setDiscountCard] = useState(contact.discount_card ?? "");
  const [discountService, setDiscountService] = useState(String(contact.discount_service ?? 0));
  const [discountGoods, setDiscountGoods] = useState(String(contact.discount_goods ?? 0));
  const [note, setNote] = useState(contact.note ?? "");
  const [tags, setTags] = useState((contact.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from("contacts")
      .update({
        first_name: firstName,
        last_name: lastName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        discount_card: discountCard || null,
        discount_service: Number(discountService) || 0,
        discount_goods: Number(discountGoods) || 0,
        note: note || null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      })
      .eq("id", contact.id);
    setSaving(false);
    router.refresh();
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Ім'я" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Прізвище" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Мобільний телефон" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Адреса" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Дисконтна картка" value={discountCard} onChange={(e) => setDiscountCard(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField label="Знижка на послуги, %" type="number" value={discountService} onChange={(e) => setDiscountService(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField label="Знижка на товари, %" type="number" value={discountGoods} onChange={(e) => setDiscountGoods(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Нотатка" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Теги (через кому)" value={tags} onChange={(e) => setTags(e.target.value)} fullWidth />
        </Grid>
      </Grid>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button variant="contained" onClick={save} disabled={saving}>
          {T.common.save}
        </Button>
      </Stack>
    </Box>
  );
}
