"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { useT, useMoney } from "@/lib/i18n/context";
import { formatDateTime } from "@/lib/money";
import type { Invoice, Payment } from "@/lib/types";
import PaymentDialog from "@/components/tickets/PaymentDialog";

export default function InvoicesTab({
  ticketId,
  clientId,
  invoices,
  payments,
  locked = false,
}: {
  ticketId: number;
  clientId: number | null;
  invoices: Invoice[];
  payments: Payment[];
  locked?: boolean;
}) {
  const money = useMoney();
  const T = useT();
  const router = useRouter();
  const supabase = createClient();
  const [dialog, setDialog] = useState<null | "prepayment" | "payout">(null);
  const [busy, setBusy] = useState(false);

  async function addInvoice() {
    setBusy(true);
    // bill amount defaults to current ticket total
    const { data } = await supabase
      .from("ticket_totals")
      .select("price")
      .eq("ticket_id", ticketId)
      .single();
    await supabase.from("invoices").insert({
      ticket_id: ticketId,
      status: "pending",
      amount: data?.price ?? 0,
    });
    setBusy(false);
    router.refresh();
  }

  const invoiceCols = useMemo<ColumnDef<Invoice, any>[]>(
    () => [
      { accessorKey: "id", header: T.ticket.invoices.number },
      {
        accessorKey: "created_at",
        header: T.ticket.invoices.created,
        cell: (c) => formatDateTime(c.row.original.created_at),
      },
      {
        accessorKey: "status",
        header: T.ticket.invoices.status,
        cell: (c) => (T.ticket.invoices as Record<string, string>)[c.row.original.status] ?? c.row.original.status,
      },
      {
        accessorKey: "payment_method",
        header: T.ticket.invoices.paymentMethod,
        cell: (c) => c.row.original.payment_method ?? "—",
      },
      {
        accessorKey: "amount",
        header: T.ticket.invoices.amount,
        cell: (c) => money(c.row.original.amount),
      },
    ],
    [money, T],
  );

  const paymentCols = useMemo<ColumnDef<Payment, any>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: T.ticket.invoices.dateTime,
        cell: (c) => formatDateTime(c.row.original.created_at),
      },
      {
        id: "comment",
        header: T.ticket.invoices.comment,
        cell: (c) => (
          <Box>
            <Typography variant="body2">
              {T.finances.txKinds[c.row.original.kind as keyof typeof T.finances.txKinds] ?? c.row.original.kind}
            </Typography>
            {c.row.original.comment && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {c.row.original.comment}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        accessorKey: "amount",
        header: T.ticket.invoices.amount,
        cell: (c) => (
          <Typography
            variant="body2"
            color={Number(c.row.original.amount) < 0 ? "error" : "success.main"}
          >
            {money(c.row.original.amount)}
          </Typography>
        ),
      },
    ],
    [money, T],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{
        mb: 1.5
      }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={addInvoice} disabled={busy || locked}>
          {T.ticket.invoices.addInvoice}
        </Button>
      </Stack>
      <DataTable
        data={invoices}
        columns={invoiceCols}
        dense
        maxHeight={240}
        emptyText={T.ticket.invoices.noInvoices}
      />
      <Stack direction="row" spacing={1.5} sx={{
        my: 1.5
      }}>
        <Button
          variant="contained"
          color="success"
          onClick={() => setDialog("prepayment")}
          disabled={!clientId || locked}
        >
          {T.ticket.invoices.addPrepayment}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => setDialog("payout")}
          disabled={!clientId || locked}
        >
          {T.ticket.invoices.addPayout}
        </Button>
      </Stack>
      <DataTable
        data={payments}
        columns={paymentCols}
        dense
        maxHeight={240}
        emptyText={T.ticket.invoices.noPayments}
      />
      {dialog && clientId && (
        <PaymentDialog
          open
          onClose={() => setDialog(null)}
          contactId={clientId}
          ticketId={ticketId}
          kind={dialog}
        />
      )}
    </Box>
  );
}
