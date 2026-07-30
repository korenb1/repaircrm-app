"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import FilterListIcon from "@mui/icons-material/FilterList";
import AccountCard from "@/components/finances/AccountCard";
import AccountDialog from "@/components/finances/AccountDialog";
import TransactionDialog from "@/components/finances/TransactionDialog";
import TransferDialog, {
  type TransferInitial,
} from "@/components/finances/TransferDialog";
import TransactionFilterPanel, {
  type TxFilter,
} from "@/components/finances/TransactionFilterPanel";
import TransactionsTable, {
  type LedgerRow,
} from "@/components/finances/TransactionsTable";
import { createClient } from "@/lib/supabase/client";
import { inPreset } from "@/lib/datePresets";
import { useT } from "@/lib/i18n/context";
import type {
  Contact,
  FinanceCategory,
  FinanceKind,
  FinancialAccount,
  FinanceTransactionRow,
} from "@/lib/types";

const signed = (kind: string, amount: number) =>
  kind === "revenue" || kind === "transfer_in" ? amount : -amount;

export default function FinancesView({
  accounts,
  transactions,
  categories,
  contacts: initialContacts,
  currentUserId,
}: {
  accounts: FinancialAccount[];
  transactions: FinanceTransactionRow[];
  categories: FinanceCategory[];
  contacts: Contact[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const T = useT();

  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selectedId, setSelectedId] = useState<number | null>(
    accounts[0]?.id ?? null,
  );
  const [now] = useState(() => Date.now());
  const [filter, setFilter] = useState<TxFilter>({ period: "all", categoryId: null });

  const [accountDialog, setAccountDialog] = useState(false);
  const [editAccount, setEditAccount] = useState<FinancialAccount | null>(null);
  const [txDialog, setTxDialog] = useState<{
    kind: FinanceKind;
    initial: FinanceTransactionRow | null;
  } | null>(null);
  const [transferDialog, setTransferDialog] = useState<{
    initial: TransferInitial | null;
  } | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  // Auto-select the first account once one exists (e.g. just after creating the
  // very first account, where selectedId initialised to null at mount).
  useEffect(() => {
    if (selectedId == null && accounts.length) setSelectedId(accounts[0].id);
  }, [accounts, selectedId]);

  const accountName = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );

  // All-time balance per account.
  const balanceByAccount = useMemo(() => {
    const m = new Map<number, number>();
    for (const t of transactions) {
      m.set(t.account_id, (m.get(t.account_id) ?? 0) + signed(t.kind, t.amount));
    }
    return m;
  }, [transactions]);

  // transfer_id -> { out_account_id, in_account_id } for counterparty labels + edit.
  const transferLegs = useMemo(() => {
    const m = new Map<string, { out?: number; in?: number; amount: number; comment: string | null }>();
    for (const t of transactions) {
      if (!t.transfer_id) continue;
      const e = m.get(t.transfer_id) ?? { amount: t.amount, comment: t.comment };
      if (t.kind === "transfer_out") e.out = t.account_id;
      if (t.kind === "transfer_in") e.in = t.account_id;
      m.set(t.transfer_id, e);
    }
    return m;
  }, [transactions]);

  // Only transfers need a synthesised label (the counterparty account). Category
  // and ticket context are rendered in the table from the row's own embeds.
  function rowLabel(tx: FinanceTransactionRow): string | null {
    if (!tx.transfer_id) return null;
    const legs = transferLegs.get(tx.transfer_id);
    if (tx.kind === "transfer_out") {
      return T.finances.transferOut.replace(
        "{name}",
        accountName.get(legs?.in ?? -1) ?? "—",
      );
    }
    return T.finances.transferIn.replace(
      "{name}",
      accountName.get(legs?.out ?? -1) ?? "—",
    );
  }

  // Ledger for the selected account: running remainder over all-time, then
  // period/category filter applied for display + totals.
  const { ledger, revenueTotal, expenseTotal } = useMemo(() => {
    if (selectedId == null)
      return { ledger: [] as LedgerRow[], revenueTotal: 0, expenseTotal: 0 };

    const accountTx = transactions
      .filter((t) => t.account_id === selectedId)
      .sort(
        (a, b) =>
          a.created_at.localeCompare(b.created_at) || a.id - b.id,
      );

    let running = 0;
    const remainderById = new Map<number, number>();
    for (const t of accountTx) {
      running += signed(t.kind, t.amount);
      remainderById.set(t.id, running);
    }

    const filtered = accountTx.filter((t) => {
      if (!inPreset(t.created_at, filter.period, now)) return false;
      if (filter.categoryId != null && t.category_id !== filter.categoryId)
        return false;
      return true;
    });

    let rev = 0;
    let exp = 0;
    for (const t of filtered) {
      if (t.kind === "revenue" || t.kind === "transfer_in") rev += t.amount;
      else exp += t.amount;
    }

    // newest first for display
    const ledger: LedgerRow[] = filtered
      .slice()
      .reverse()
      .map((tx) => ({
        tx,
        remainder: remainderById.get(tx.id) ?? 0,
        label: rowLabel(tx),
      }));

    return { ledger, revenueTotal: rev, expenseTotal: exp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, selectedId, filter, now, transferLegs, accountName, T]);

  function onContactCreated(c: Contact) {
    setContacts((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c]));
  }

  function onEdit(tx: FinanceTransactionRow) {
    if (tx.transfer_id) {
      const legs = transferLegs.get(tx.transfer_id);
      if (legs?.out != null && legs?.in != null) {
        setTransferDialog({
          initial: {
            transfer_id: tx.transfer_id,
            from_account_id: legs.out,
            to_account_id: legs.in,
            amount: tx.amount,
            comment: tx.comment,
          },
        });
      }
      return;
    }
    setTxDialog({ kind: tx.kind as FinanceKind, initial: tx });
  }

  async function onDelete(tx: FinanceTransactionRow) {
    const confirmMsg = tx.transfer_id
      ? T.finances.transferDialog.deleteConfirm
      : T.finances.tx.deleteConfirm;
    if (!window.confirm(confirmMsg)) return;
    if (tx.transfer_id) {
      await supabase
        .from("finance_transactions")
        .delete()
        .eq("transfer_id", tx.transfer_id);
    } else {
      await supabase.from("finance_transactions").delete().eq("id", tx.id);
    }
    router.refresh();
  }

  const filterActive = filter.period !== "all" || filter.categoryId != null;

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexWrap: { xs: "wrap", md: "nowrap" } }}>
      {/* Left: account cards */}
      <Stack spacing={1.5} sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
        {accounts.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            balance={balanceByAccount.get(a.id) ?? 0}
            selected={a.id === selectedId}
            onClick={() => setSelectedId(a.id)}
            onEdit={() => setEditAccount(a)}
          />
        ))}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAccountDialog(true)}
        >
          {T.finances.createAccount}
        </Button>
      </Stack>

      {/* Right: toolbar + ledger */}
      <Box sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<TrendingUpIcon />}
            disabled={accounts.length === 0}
            onClick={() => setTxDialog({ kind: "revenue", initial: null })}
          >
            {T.finances.revenue}
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<TrendingDownIcon />}
            disabled={accounts.length === 0}
            onClick={() => setTxDialog({ kind: "expense", initial: null })}
          >
            {T.finances.expense}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            disabled={accounts.length < 2}
            onClick={() => setTransferDialog({ initial: null })}
          >
            {T.finances.transfer}
          </Button>
          <Button
            variant={filterActive ? "contained" : "outlined"}
            startIcon={<FilterListIcon />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
          >
            {T.finances.filter}
          </Button>
        </Stack>

        {selectedId == null ? (
          <Paper elevation={0} sx={{ p: 6, textAlign: "center", border: "1px dashed #cfd8dc" }}>
            <Typography sx={{ color: "text.secondary" }}>
              {accounts.length === 0
                ? T.finances.noAccounts
                : T.finances.selectAccount}
            </Typography>
          </Paper>
        ) : (
          <TransactionsTable
            rows={ledger}
            revenueTotal={revenueTotal}
            expenseTotal={expenseTotal}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </Box>

      {accountDialog && (
        <AccountDialog count={accounts.length} onClose={() => setAccountDialog(false)} />
      )}
      {editAccount && (
        <AccountDialog
          count={accounts.length}
          account={editAccount}
          onClose={() => setEditAccount(null)}
        />
      )}
      {txDialog && (
        <TransactionDialog
          key={txDialog.initial?.id ?? `new-${txDialog.kind}`}
          kind={txDialog.kind}
          accounts={accounts}
          categories={categories}
          contacts={contacts}
          defaultAccountId={selectedId}
          currentUserId={currentUserId}
          initial={txDialog.initial}
          onContactCreated={onContactCreated}
          onClose={() => setTxDialog(null)}
        />
      )}
      {transferDialog && (
        <TransferDialog
          key={transferDialog.initial?.transfer_id ?? "new-transfer"}
          accounts={accounts}
          defaultFromId={selectedId}
          currentUserId={currentUserId}
          initial={transferDialog.initial}
          onClose={() => setTransferDialog(null)}
        />
      )}
      <TransactionFilterPanel
        anchorEl={filterAnchor}
        value={filter}
        categories={categories}
        onChange={setFilter}
        onClose={() => setFilterAnchor(null)}
      />
    </Box>
  );
}
