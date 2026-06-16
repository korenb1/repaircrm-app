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
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type { FinanceAccountType, FinancialAccount } from "@/lib/types";

const TYPE_OPTIONS: FinanceAccountType[] = ["cash", "cashless", "card"];

export default function AccountDialog({
  count,
  account,
  onClose,
}: {
  count: number;
  account?: FinancialAccount | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const editing = Boolean(account);
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<FinanceAccountType>(account?.type ?? "cash");
  const [last4, setLast4] = useState(account?.card_last4 ?? "");
  const [saving, setSaving] = useState(false);

  const last4Invalid = type === "card" && last4.length !== 4;
  const canSave = Boolean(name.trim()) && !last4Invalid;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    const fields = {
      name: name.trim(),
      type,
      card_last4: type === "card" ? last4 : null,
    };
    if (editing && account) {
      await supabase
        .from("financial_accounts")
        .update(fields)
        .eq("id", account.id);
    } else {
      const row: Omit<FinancialAccount, "id" | "created_at"> = {
        ...fields,
        sort_order: count + 1,
      };
      await supabase.from("financial_accounts").insert(row);
    }
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {editing ? T.finances.editAccount : T.finances.createAccount}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={T.finances.account.name}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label={T.finances.account.type}
            value={type}
            onChange={(e) => setType(e.target.value as FinanceAccountType)}
            fullWidth
          >
            {TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>
                {T.finances.types[t]}
              </MenuItem>
            ))}
          </TextField>
          {type === "card" && (
            <TextField
              label={T.finances.account.last4}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              helperText={T.finances.account.last4Hint}
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 4 } }}
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !canSave}>
          {editing ? T.common.save : T.common.create}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
