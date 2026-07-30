"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { useT, useMoney } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n";
import { formatDate } from "@/lib/money";
import type { FinanceTransactionRow, PaymentKind } from "@/lib/types";

export interface LedgerRow {
  tx: FinanceTransactionRow;
  remainder: number;
  // Synthesised label for transfers (counterparty account); null otherwise.
  label: string | null;
}

const isRevenue = (k: string) => k === "revenue" || k === "transfer_in";

const linkSx = {
  color: "#1976d2",
  fontWeight: 600,
  textDecoration: "none",
} as const;

function kindLabel(T: Dict, tx: FinanceTransactionRow): string {
  const k = tx.source_kind as PaymentKind | null;
  if (k) return T.finances.txKinds[k];
  return isRevenue(tx.kind)
    ? T.finances.txKinds.payment
    : T.finances.txKinds.refund;
}

function CommentCell({ tx, label }: { tx: FinanceTransactionRow; label: string | null }) {
  const T = useT();
  const category = tx.category?.name ?? null;

  let primary: React.ReactNode;
  if (tx.transfer_id) {
    primary = label ?? "—";
  } else if (tx.ticket) {
    const device = [tx.ticket.group?.name, tx.ticket.brand?.name, tx.ticket.model?.name]
      .filter(Boolean)
      .join(" ");
    primary = (
      <>
        {T.finances.ticketRef.replace("{kind}", kindLabel(T, tx))}{" "}
        <Link href={`/workflows/${tx.ticket.id}`} style={linkSx}>
          #{tx.ticket.number}
        </Link>
        {device && ` (${device})`}
      </>
    );
  } else {
    primary = tx.comment || "—";
  }

  return (
    <Stack spacing={0.25}>
      <Typography variant="body2">{primary}</Typography>
      {category && !tx.transfer_id && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {category}
        </Typography>
      )}
    </Stack>
  );
}

export default function TransactionsTable({
  rows,
  revenueTotal,
  expenseTotal,
  onEdit,
  onDelete,
}: {
  rows: LedgerRow[];
  revenueTotal: number;
  expenseTotal: number;
  onEdit: (tx: FinanceTransactionRow) => void;
  onDelete: (tx: FinanceTransactionRow) => void;
}) {
  const T = useT();
  const money = useMoney();
  const cols = useMemo<ColumnDef<LedgerRow, any>[]>(
    () => [
      {
        id: "date",
        header: T.finances.cols.date,
        cell: (c) => formatDate(c.row.original.tx.created_at),
      },
      {
        id: "user",
        header: T.finances.cols.user,
        cell: (c) => c.row.original.tx.creator?.full_name ?? "—",
      },
      {
        id: "contact",
        header: T.finances.cols.contact,
        enableSorting: false,
        cell: (c) => {
          const ct = c.row.original.tx.contact;
          if (!ct) return "—";
          const name = [ct.first_name, ct.last_name].filter(Boolean).join(" ");
          return (
            <Link href={`/contacts/${ct.id}`} style={linkSx}>
              {name || "—"}
            </Link>
          );
        },
      },
      {
        id: "comment",
        header: T.finances.cols.comment,
        size: 280,
        enableSorting: false,
        cell: (c) => (
          <CommentCell tx={c.row.original.tx} label={c.row.original.label} />
        ),
      },
      {
        id: "revenue",
        header: T.finances.cols.revenue,
        cell: (c) =>
          isRevenue(c.row.original.tx.kind) ? (
            <Typography sx={{ color: "#2e7d32", fontWeight: 600 }}>
              {money(c.row.original.tx.amount)}
            </Typography>
          ) : (
            "—"
          ),
        footer: () => (
          <Typography sx={{ color: "#2e7d32", fontWeight: 700 }}>
            {money(revenueTotal)}
          </Typography>
        ),
      },
      {
        id: "expense",
        header: T.finances.cols.expense,
        cell: (c) =>
          !isRevenue(c.row.original.tx.kind) ? (
            <Typography sx={{ color: "#c62828", fontWeight: 600 }}>
              {money(c.row.original.tx.amount)}
            </Typography>
          ) : (
            "—"
          ),
        footer: () => (
          <Typography sx={{ color: "#c62828", fontWeight: 700 }}>
            {money(expenseTotal)}
          </Typography>
        ),
      },
      {
        id: "remainder",
        header: T.finances.cols.remainder,
        cell: (c) => money(c.row.original.remainder),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (c) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => onEdit(c.row.original.tx)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onDelete(c.row.original.tx)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [onEdit, onDelete, revenueTotal, expenseTotal, T, money],
  );

  return (
    <Box>
      <DataTable data={rows} columns={cols} storageKey="finance-ledger" />
    </Box>
  );
}
