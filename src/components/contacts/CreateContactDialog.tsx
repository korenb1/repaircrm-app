"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";

export default function CreateContactDialog({
  open,
  onClose,
  defaultType = "person",
}: {
  open: boolean;
  onClose: () => void;
  defaultType?: "person" | "organization";
}) {
  const router = useRouter();
  const supabase = createClient();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [type, setType] = useState<"person" | "organization">(defaultType);
  const [isSupplier, setIsSupplier] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [discountCard, setDiscountCard] = useState("");
  const [discountService, setDiscountService] = useState("0");
  const [discountGoods, setDiscountGoods] = useState("0");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setIsSupplier(false);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDiscountCard("");
    setDiscountService("0");
    setDiscountGoods("0");
    setNote("");
    setTags("");
  }

  async function submit() {
    if (!firstName.trim()) return;
    setSaving(true);
    await supabase.from("contacts").insert({
      type,
      is_supplier: isSupplier,
      first_name: firstName,
      last_name: lastName || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      discount_card: discountCard || null,
      discount_service: Number(discountService) || 0,
      discount_goods: Number(discountGoods) || 0,
      note: note || null,
      tags: tags
        ? tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    });
    setSaving(false);
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
        Новий контакт
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <ToggleButtonGroup
            exclusive
            value={type}
            onChange={(_, v) => v && setType(v)}
            size="small"
          >
            <ToggleButton value="person">Людина</ToggleButton>
            <ToggleButton value="organization">Організація</ToggleButton>
          </ToggleButtonGroup>

          <FormControlLabel
            control={
              <Checkbox
                checked={isSupplier}
                onChange={(e) => setIsSupplier(e.target.checked)}
              />
            }
            label="Постачальник"
          />

          <Divider textAlign="left">
            <Typography variant="subtitle2">Контактні дані</Typography>
          </Divider>

          <TextField
            label="Ім'я"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Прізвище"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Мобільний телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+380"
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Адреса"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
          />

          <Divider textAlign="left">
            <Typography variant="subtitle2">Знижки</Typography>
          </Divider>

          <TextField
            label="Дисконтна картка"
            value={discountCard}
            onChange={(e) => setDiscountCard(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Знижка на послуги, %"
              type="number"
              value={discountService}
              onChange={(e) => setDiscountService(e.target.value)}
              fullWidth
            />
            <TextField
              label="Знижка на товари, %"
              type="number"
              value={discountGoods}
              onChange={(e) => setDiscountGoods(e.target.value)}
              fullWidth
            />
          </Stack>

          <Divider textAlign="left">
            <Typography variant="subtitle2">Інше</Typography>
          </Divider>

          <TextField
            label="Нотатка"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Теги (через кому)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {T.common.create}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
