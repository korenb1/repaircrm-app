"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import NumberField from "@/components/NumberField";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type { FinancialAccount } from "@/lib/types";

export interface TransferInitial {
  transfer_id: string;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  comment: string | null;
}

export default function TransferDialog({
  accounts,
  defaultFromId,
  currentUserId,
  initial,
  onClose,
}: {
  accounts: FinancialAccount[];
  defaultFromId: number | null;
  currentUserId: string | null;
  initial: TransferInitial | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = Boolean(initial);

  const [fromId, setFromId] = useState<number | null>(
    initial?.from_account_id ?? defaultFromId ?? accounts[0]?.id ?? null,
  );
  const [toId, setToId] = useState<number | null>(
    initial?.to_account_id ?? null,
  );
  const [amount, setAmount] = useState<number | null>(initial?.amount ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const sameError = fromId != null && toId != null && fromId === toId;
  const canSave =
    fromId != null && toId != null && !sameError && amount != null && amount > 0;

  async function submit() {
    if (!canSave) return;
    setSaving(true);

    if (isEdit) {
      const tid = initial!.transfer_id;
      await supabase
        .from("finance_transactions")
        .update({ account_id: fromId, amount, comment: comment.trim() || null })
        .eq("transfer_id", tid)
        .eq("kind", "transfer_out");
      await supabase
        .from("finance_transactions")
        .update({ account_id: toId, amount, comment: comment.trim() || null })
        .eq("transfer_id", tid)
        .eq("kind", "transfer_in");
    } else {
      const tid = crypto.randomUUID();
      const c = comment.trim() || null;
      await supabase.from("finance_transactions").insert([
        {
          account_id: fromId,
          kind: "transfer_out",
          amount,
          comment: c,
          transfer_id: tid,
          created_by: currentUserId,
        },
        {
          account_id: toId,
          kind: "transfer_in",
          amount,
          comment: c,
          transfer_id: tid,
          created_by: currentUserId,
        },
      ]);
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{T.finances.transferDialog.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label={T.finances.transferDialog.from}
            value={fromId ?? ""}
            onChange={(e) => setFromId(Number(e.target.value))}
            fullWidth
          >
            {accounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={T.finances.transferDialog.to}
            value={toId ?? ""}
            onChange={(e) => setToId(Number(e.target.value))}
            error={sameError}
            helperText={sameError ? T.finances.transferDialog.sameError : undefined}
            fullWidth
          >
            {accounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <NumberField
            label={T.finances.transferDialog.amount}
            value={amount}
            onValueChange={(v) => setAmount(v)}
            min={0}
            required
            fullWidth
          />
          <TextField
            label={T.finances.transferDialog.comment}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !canSave}>
          {T.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
