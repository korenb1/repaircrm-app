"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
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
import type { FinancialAccount, PaymentKind } from "@/lib/types";

const TITLE: Record<PaymentKind, string> = {
  payment: "Оплата",
  prepayment: "Передоплата",
  advance: "Аванс",
  payout: "Виплата",
  correction: "Коригування",
  refund: "Повернення",
};

// kinds that decrease the balance (stored as negative)
const NEGATIVE: PaymentKind[] = ["payout"];
// kinds where the user may enter a signed value directly
const SIGNED: PaymentKind[] = ["correction"];

// Cash-moving kinds also book a finance_transaction against a chosen account.
// Money-in kinds → revenue; money-out kinds → expense. Pure balance
// adjustments (correction/refund) move no real cash, so they pick no account.
const FINANCE_KIND: Partial<Record<PaymentKind, "revenue" | "expense">> = {
  payment: "revenue",
  prepayment: "revenue",
  advance: "revenue",
  payout: "expense",
};

export default function PaymentDialog({
  open,
  onClose,
  contactId,
  ticketId,
  kind,
  defaultAmount = null,
}: {
  open: boolean;
  onClose: () => void;
  contactId: number;
  ticketId?: number | null;
  kind: PaymentKind;
  defaultAmount?: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [amount, setAmount] = useState<number | null>(defaultAmount);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const financeKind = FINANCE_KIND[kind];
  const needsAccount = financeKind != null;
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(needsAccount);

  // Load financial accounts + current user only for cash-moving kinds.
  useEffect(() => {
    if (!open || !needsAccount) return;
    let active = true;
    (async () => {
      const [{ data: accs }, { data: auth }] = await Promise.all([
        supabase.from("financial_accounts").select("*").order("sort_order"),
        supabase.auth.getUser(),
      ]);
      if (!active) return;
      const list = (accs ?? []) as FinancialAccount[];
      setAccounts(list);
      setAccountId(list[0]?.id ?? null);
      setUserId(auth?.user?.id ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, needsAccount, supabase]);

  const noAccounts = needsAccount && !loading && accounts.length === 0;
  const canSave =
    !busy && !loading && (amount ?? 0) !== 0 && (!needsAccount || accountId != null);

  async function save() {
    const raw = amount ?? 0;
    if (!raw || !canSave) return;
    let value = Math.abs(raw);
    if (NEGATIVE.includes(kind)) value = -value;
    else if (SIGNED.includes(kind)) value = raw; // keep user sign

    setBusy(true);
    const { error: payErr } = await supabase.from("payments").insert({
      contact_id: contactId,
      ticket_id: ticketId ?? null,
      kind,
      amount: value,
      comment: comment || null,
    });
    if (payErr) {
      setBusy(false);
      return;
    }

    // Mirror the cash movement into the chosen finance account.
    if (needsAccount && accountId != null) {
      await supabase.from("finance_transactions").insert({
        account_id: accountId,
        kind: financeKind,
        amount: Math.abs(raw),
        contact_id: contactId,
        ticket_id: ticketId ?? null,
        source_kind: kind,
        comment: comment || null,
        created_by: userId,
      });
    }

    // Refresh before closing: when a caller's onClose navigates (e.g. the
    // create-ticket prepayment flow), that navigation must be the last router
    // op or a trailing refresh here aborts it and leaves the user in place.
    router.refresh();
    setBusy(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{TITLE[kind]}</DialogTitle>
      <DialogContent dividers>
        {noAccounts && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {T.issue.noAccounts}
          </Alert>
        )}
        <Stack spacing={2}>
          <NumberField
            label={SIGNED.includes(kind) ? "Сума (+/−)" : "Сума"}
            value={amount}
            onValueChange={(v) => setAmount(v)}
            autoFocus
            fullWidth
          />
          {needsAccount && (
            <TextField
              select
              label={T.issue.account}
              required
              value={accountId ?? ""}
              onChange={(e) => setAccountId(Number(e.target.value))}
              disabled={loading || noAccounts}
              helperText={accountId == null && !loading ? T.issue.accountRequired : undefined}
              error={accountId == null && !loading && !noAccounts}
              fullWidth
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
          )}
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
        <Button variant="contained" onClick={save} disabled={!canSave}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
}
