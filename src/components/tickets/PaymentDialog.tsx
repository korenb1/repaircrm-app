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
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/context";
import type { FinancialAccount, PaymentKind } from "@/lib/types";

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
  const T = useT();
  const router = useRouter();
  const supabase = createClient();
  const [amount, setAmount] = useState<number | null>(defaultAmount);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const financeKind = FINANCE_KIND[kind];
  const needsAccount = financeKind != null;
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(needsAccount);

  // Load financial accounts, the default category and current user only for
  // cash-moving kinds. The default category ("Repair") is the one flagged
  // is_default_closed for the finance kind — same as the issue-ticket flow.
  useEffect(() => {
    if (!open || !needsAccount) return;
    let active = true;
    (async () => {
      const [{ data: accs }, { data: defCat }, { data: auth }] = await Promise.all([
        supabase.from("financial_accounts").select("*").order("sort_order"),
        supabase
          .from("finance_categories")
          .select("id")
          .eq("kind", financeKind)
          .eq("is_default_closed", true)
          .maybeSingle(),
        authClient.getSession(),
      ]);
      if (!active) return;
      const list = (accs ?? []) as FinancialAccount[];
      setAccounts(list);
      setAccountId(list[0]?.id ?? null);
      setCategoryId(defCat?.id ?? null);
      setUserId(auth?.user.id ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, needsAccount, financeKind]);

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
        category_id: categoryId,
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
      <DialogTitle>{T.finances.txKinds[kind as keyof typeof T.finances.txKinds]}</DialogTitle>
      <DialogContent dividers>
        {noAccounts && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {T.issue.noAccounts}
          </Alert>
        )}
        <Stack spacing={2}>
          <NumberField
            label={SIGNED.includes(kind) ? T.ticket.invoices.amountSigned : T.ticket.invoices.amount}
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
        <Button variant="contained" onClick={save} disabled={!canSave}>
          {T.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
