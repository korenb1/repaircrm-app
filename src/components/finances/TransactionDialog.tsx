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
import ClientAutocomplete from "@/components/tickets/ClientAutocomplete";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type {
  Contact,
  FinanceCategory,
  FinanceKind,
  FinancialAccount,
  FinanceTransactionRow,
} from "@/lib/types";

// Shared revenue/expense entry dialog. `kind` selects which categories are
// offered and the title; `initial` switches it into edit mode.
export default function TransactionDialog({
  kind,
  accounts,
  categories,
  contacts,
  defaultAccountId,
  currentUserId,
  initial,
  onContactCreated,
  onClose,
}: {
  kind: FinanceKind;
  accounts: FinancialAccount[];
  categories: FinanceCategory[];
  contacts: Contact[];
  defaultAccountId: number | null;
  currentUserId: string | null;
  initial: FinanceTransactionRow | null;
  onContactCreated: (c: Contact) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = Boolean(initial);

  const [contact, setContact] = useState<Contact | null>(
    initial?.contact_id
      ? contacts.find((c) => c.id === initial.contact_id) ?? null
      : null,
  );
  const [amount, setAmount] = useState<number | null>(initial?.amount ?? null);
  const [accountId, setAccountId] = useState<number | null>(
    initial?.account_id ?? defaultAccountId ?? accounts[0]?.id ?? null,
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initial?.category_id ?? null,
  );
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const kindCategories = categories.filter((c) => c.kind === kind);
  const canSave =
    amount != null && amount > 0 && accountId != null && categoryId != null;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    const row = {
      account_id: accountId,
      kind,
      amount,
      category_id: categoryId,
      contact_id: contact?.id ?? null,
      comment: comment.trim() || null,
    };
    if (isEdit) {
      await supabase.from("finance_transactions").update(row).eq("id", initial!.id);
    } else {
      await supabase
        .from("finance_transactions")
        .insert({ ...row, created_by: currentUserId });
    }
    setSaving(false);
    onClose();
    router.refresh();
  }

  const title = isEdit
    ? kind === "revenue"
      ? T.finances.tx.editRevenue
      : T.finances.tx.editExpense
    : kind === "revenue"
      ? T.finances.tx.newRevenue
      : T.finances.tx.newExpense;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <ClientAutocomplete
            contacts={contacts}
            value={contact}
            onChange={setContact}
            onContactCreated={onContactCreated}
          />
          <NumberField
            label={T.finances.tx.amount}
            value={amount}
            onValueChange={(v) => setAmount(v)}
            min={0}
            required
            fullWidth
          />
          <TextField
            select
            label={T.finances.tx.account}
            value={accountId ?? ""}
            onChange={(e) => setAccountId(Number(e.target.value))}
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
            label={T.finances.tx.category}
            required
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            fullWidth
          >
            {kindCategories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={T.finances.tx.comment}
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
