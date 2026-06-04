"use client";
import { useMemo, useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import PaymentDialog from "@/components/tickets/PaymentDialog";
import { formatUAH, formatDateTime } from "@/lib/money";
import type { Payment, PaymentKind, TicketRow } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  payment: "Оплата",
  prepayment: "Передоплата",
  advance: "Аванс",
  payout: "Виплата",
  correction: "Коригування",
};

// One ledger event (payment rows + ticket reference rows).
interface Event {
  date: string;
  description: string;
  change: number | null; // null = informational (ticket created)
}

export default function BalanceTab({
  contactId,
  balance,
  payments,
  tickets,
}: {
  contactId: number;
  balance: number;
  payments: Payment[];
  tickets: TicketRow[];
}) {
  const [dialog, setDialog] = useState<null | PaymentKind>(null);

  const events = useMemo<Event[]>(() => {
    const rows: Event[] = [];
    for (const p of payments) {
      rows.push({
        date: p.created_at,
        description:
          KIND_LABEL[p.kind] +
          (p.ticket_id ? ` (заявка #${p.ticket_id})` : "") +
          (p.comment ? ` — ${p.comment}` : ""),
        change: Number(p.amount),
      });
    }
    for (const t of tickets) {
      rows.push({
        date: t.created_at,
        description: `Заявка ${t.number}`,
        change: null,
      });
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [payments, tickets]);

  const cols = useMemo<ColumnDef<Event, any>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Дата і час",
        cell: (c) => formatDateTime(c.row.original.date),
      },
      { accessorKey: "description", header: "Опис події" },
      {
        accessorKey: "change",
        header: "Зміна балансу, ₴",
        cell: (c) => {
          const v = c.row.original.change;
          if (v === null) return "—";
          return (
            <Typography variant="body2" color={v < 0 ? "error" : "success.main"}>
              {v > 0 ? "+" : ""}
              {formatUAH(v)}
            </Typography>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: "flex", alignItems: "center" }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Баланс складається із суми всіх взаєморозрахунків
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="caption" color="text.secondary">
            Баланс
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {formatUAH(balance)}
          </Typography>
          <Typography variant="caption" color={balance === 0 ? "success.main" : "text.secondary"}>
            {balance === 0 ? "Розраховано" : ""}
          </Typography>
        </Box>
      </Paper>

      <Stack direction="row" spacing={1.5} mb={1.5}>
        <Button variant="contained" color="success" onClick={() => setDialog("advance")}>
          + Аванс
        </Button>
        <Button variant="contained" color="error" onClick={() => setDialog("payout")}>
          − Виплата
        </Button>
        <Button variant="outlined" onClick={() => setDialog("correction")}>
          + Коригування
        </Button>
      </Stack>

      <DataTable data={events} columns={cols} dense maxHeight={420} emptyText="Немає подій" />

      {dialog && (
        <PaymentDialog
          open
          onClose={() => setDialog(null)}
          contactId={contactId}
          kind={dialog}
        />
      )}
    </Box>
  );
}
