"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import NumberField from "@/components/NumberField";
import { createClient } from "@/lib/supabase/client";
import type { PaymentKind } from "@/lib/types";

const TITLE: Record<PaymentKind, string> = {
  payment: "Оплата",
  prepayment: "Передоплата",
  advance: "Аванс",
  payout: "Виплата",
  correction: "Коригування",
};

// kinds that decrease the balance (stored as negative)
const NEGATIVE: PaymentKind[] = ["payout"];
// kinds where the user may enter a signed value directly
const SIGNED: PaymentKind[] = ["correction"];

export default function PaymentDialog({
  open,
  onClose,
  contactId,
  ticketId,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  contactId: number;
  ticketId?: number | null;
  kind: PaymentKind;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [amount, setAmount] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const raw = amount ?? 0;
    if (!raw) return;
    let value = Math.abs(raw);
    if (NEGATIVE.includes(kind)) value = -value;
    else if (SIGNED.includes(kind)) value = raw; // keep user sign

    setBusy(true);
    await supabase.from("payments").insert({
      contact_id: contactId,
      ticket_id: ticketId ?? null,
      kind,
      amount: value,
      comment: comment || null,
    });
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{TITLE[kind]}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <NumberField
            label={SIGNED.includes(kind) ? "Сума (+/−)" : "Сума"}
            value={amount}
            onValueChange={(v) => setAmount(v)}
            autoFocus
            fullWidth
          />
          <TextField
            label="Коментар"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button variant="contained" onClick={save} disabled={busy}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
}
