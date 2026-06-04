"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { formatUAH, formatDateTime } from "@/lib/money";
import type { Invoice, Payment } from "@/lib/types";
import PaymentDialog from "@/components/tickets/PaymentDialog";

const INVOICE_STATUS: Record<string, string> = {
  pending: "Очікує",
  paid: "Оплачено",
  cancelled: "Скасовано",
};

const PAYMENT_KIND: Record<string, string> = {
  payment: "Оплата",
  prepayment: "Передоплата",
  payout: "Виплата",
  advance: "Аванс",
  correction: "Коригування",
};

export default function InvoicesTab({
  ticketId,
  clientId,
  invoices,
  payments,
}: {
  ticketId: number;
  clientId: number | null;
  invoices: Invoice[];
  payments: Payment[];
}) {
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
      { accessorKey: "id", header: "№" },
      {
        accessorKey: "created_at",
        header: "Створено",
        cell: (c) => formatDateTime(c.row.original.created_at),
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: (c) => INVOICE_STATUS[c.row.original.status] ?? c.row.original.status,
      },
      {
        accessorKey: "payment_method",
        header: "Метод оплати",
        cell: (c) => c.row.original.payment_method ?? "—",
      },
      {
        accessorKey: "amount",
        header: "Сума",
        cell: (c) => formatUAH(c.row.original.amount),
      },
    ],
    [],
  );

  const paymentCols = useMemo<ColumnDef<Payment, any>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Дата і час",
        cell: (c) => formatDateTime(c.row.original.created_at),
      },
      {
        id: "comment",
        header: "Коментар",
        cell: (c) => (
          <Box>
            <Typography variant="body2">
              {PAYMENT_KIND[c.row.original.kind] ?? c.row.original.kind}
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
        header: "Сума",
        cell: (c) => (
          <Typography
            variant="body2"
            color={Number(c.row.original.amount) < 0 ? "error" : "success.main"}
          >
            {formatUAH(c.row.original.amount)}
          </Typography>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{
        mb: 1.5
      }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={addInvoice} disabled={busy}>
          Рахунок
        </Button>
      </Stack>
      <DataTable
        data={invoices}
        columns={invoiceCols}
        dense
        maxHeight={240}
        emptyText="Ще немає рахунків"
      />
      <Stack direction="row" spacing={1.5} sx={{
        my: 1.5
      }}>
        <Button
          variant="contained"
          color="success"
          onClick={() => setDialog("prepayment")}
          disabled={!clientId}
        >
          Передоплата
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => setDialog("payout")}
          disabled={!clientId}
        >
          Виплата
        </Button>
      </Stack>
      <DataTable
        data={payments}
        columns={paymentCols}
        dense
        maxHeight={240}
        emptyText="Ще немає оплат"
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
