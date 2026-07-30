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
import type { FinancialAccount } from "@/lib/types";

// Shown before a ticket moves into a terminal (closed) status.
//  - mode "pay" (closed_success): books the customer's outstanding payment into
//    a financial account (revenue, tagged with the default-for-closed revenue
//    category) and settles the contact balance.
//  - mode "refund" (closed_fail): returns whatever the customer has already paid
//    on this ticket (prepayment/advance/payment) — books an expense and reverses
//    the contact balance with a negative-amount refund payment row.
// Either way the ticket status is then flipped to `targetStatus`.
export default function IssueTicketDialog({
  ticketId,
  targetStatus,
  mode = "pay",
  onCancel,
  onIssued,
}: {
  ticketId: number;
  targetStatus: string;
  mode?: "pay" | "refund";
  onCancel: () => void;
  onIssued: () => void;
}) {
  const isRefund = mode === "refund";
  const T = useT();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [amount, setAmount] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const [
        { data: ticket },
        { data: totals },
        { data: paidRows },
        { data: accs },
        { data: defCat },
        { data: auth },
      ] = await Promise.all([
        supabase
          .from("tickets")
          .select("client_id, client:contacts(first_name,last_name)")
          .eq("id", ticketId)
          .single(),
        supabase.from("ticket_totals").select("price, paid").eq("ticket_id", ticketId).single(),
        // What the client has already paid on this ticket (for the refund amount).
        supabase
          .from("payments")
          .select("amount")
          .eq("ticket_id", ticketId)
          .in("kind", ["prepayment", "advance", "payment"]),
        supabase.from("financial_accounts").select("*").order("sort_order"),
        supabase
          .from("finance_categories")
          .select("id")
          .eq("kind", "revenue")
          .eq("is_default_closed", true)
          .maybeSingle(),
        authClient.getSession(),
      ]);
      if (!active) return;

      const client = (ticket as { client?: { first_name: string; last_name: string | null } } | null)?.client;
      setClientName(
        client ? [client.first_name, client.last_name].filter(Boolean).join(" ") : "—",
      );
      setClientId((ticket as { client_id?: number | null } | null)?.client_id ?? null);

      if (isRefund) {
        const refundable = (paidRows ?? []).reduce(
          (sum, r) => sum + Number((r as { amount: number }).amount),
          0,
        );
        setAmount(refundable > 0 ? refundable : null);
      } else {
        const outstanding = Math.max(0, (totals?.price ?? 0) - (totals?.paid ?? 0));
        setAmount(outstanding || null);
      }

      const list = (accs ?? []) as FinancialAccount[];
      setAccounts(list);
      setAccountId(list[0]?.id ?? null);
      setDefaultCategoryId(defCat?.id ?? null);
      setUserId(auth?.user.id ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [ticketId, isRefund]);

  const noAccounts = !loading && accounts.length === 0;
  const canConfirm = !busy && !loading && accountId != null;

  async function confirm() {
    if (!canConfirm) return;
    setBusy(true);
    setError(null);

    // Book the money movement only when there is an amount to record.
    if (amount != null && amount > 0) {
      const { error: txErr } = await supabase.from("finance_transactions").insert({
        account_id: accountId,
        // Paying out a refund is an expense; a normal close is revenue.
        kind: isRefund ? "expense" : "revenue",
        amount,
        category_id: isRefund ? null : defaultCategoryId,
        contact_id: clientId,
        ticket_id: ticketId,
        source_kind: isRefund ? "refund" : "payment",
        comment: comment.trim() || null,
        created_by: userId,
      });
      if (txErr) {
        setError(txErr.message);
        setBusy(false);
        return;
      }

      // Mirror into the contact ledger so the balance settles. A refund is a
      // negative-amount row that reverses the prepayment back to the client.
      if (clientId != null) {
        const { error: payErr } = await supabase.from("payments").insert({
          contact_id: clientId,
          ticket_id: ticketId,
          kind: isRefund ? "refund" : "payment",
          amount: isRefund ? -amount : amount,
          comment: comment.trim() || null,
        });
        if (payErr) {
          setError(payErr.message);
          setBusy(false);
          return;
        }
      }
    }

    const { error: stErr } = await supabase
      .from("tickets")
      .update({ status: targetStatus })
      .eq("id", ticketId);
    setBusy(false);
    if (stErr) {
      setError(stErr.message);
      return;
    }
    onIssued();
    router.refresh();
  }

  return (
    <Dialog open onClose={busy ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{isRefund ? T.issue.refundTitle : T.issue.title}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {noAccounts && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {T.issue.noAccounts}
          </Alert>
        )}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={T.issue.client}
            value={loading ? T.issue.loading : clientName}
            slotProps={{ input: { readOnly: true } }}
            fullWidth
          />
          <NumberField
            label={isRefund ? T.issue.refundAmount : T.issue.amount}
            value={amount}
            onValueChange={(v) => setAmount(v)}
            min={0}
            readOnly
            disabled={loading}
            fullWidth
          />
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
          <TextField
            label={T.issue.comment}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          {T.common.cancel}
        </Button>
        <Button variant="contained" onClick={confirm} disabled={!canConfirm}>
          {isRefund ? T.issue.refundConfirm : T.issue.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
