"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import PaymentDialog from "@/components/tickets/PaymentDialog";
import { formatDateTime } from "@/lib/money";
import { useMoney, useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n";
import type { Payment, PaymentKind, TicketRow } from "@/lib/types";

// One ledger event (payment rows + ticket reference rows).
interface Event {
  date: string;
  description: string;
  change: number | null; // null = informational (ticket created)
  ticketId?: number; // present => the AXXXX token in the description links to the ticket card
  ticketNumber?: string; // the AXXXX token to linkify within the description
  device?: string; // "group brand model" shown after the ticket number
}

export default function BalanceTab({
  contactId,
  balance,
  payments,
  tickets,
  readyAt = {},
}: {
  contactId: number;
  balance: number;
  payments: Payment[];
  tickets: TicketRow[];
  readyAt?: Record<number, string>;
}) {
  const money = useMoney();
  const T = useT();
  const [dialog, setDialog] = useState<null | PaymentKind>(null);

  const events = useMemo<Event[]>(() => {
    const rows: Event[] = [];
    const ticketNumber = new Map<number, string>(tickets.map((t) => [t.id, t.number]));
    const ticketDevice = new Map<number, string>(
      tickets.map((t) => [
        t.id,
        [t.group?.name, t.brand?.name, t.model?.name].filter(Boolean).join(" "),
      ]),
    );

    // Every payment reduces what the client owes us, so it is stored positive
    // but shown as a negative change against the balance.
    for (const p of payments) {
      const num = p.ticket_id != null ? ticketNumber.get(p.ticket_id) : undefined;
      let description: string;
      if (num) {
        if (p.kind === "prepayment") description = fmt(T.contactCard.balance.prepaymentForTicket, { num });
        else if (p.kind === "payment") description = fmt(T.contactCard.balance.paymentForTicket, { num });
        else description = fmt(T.contactCard.balance.kindForTicket, { kind: T.finances.txKinds[p.kind], num });
      } else {
        description = T.finances.txKinds[p.kind] + (p.comment ? ` — ${p.comment}` : "");
      }
      rows.push({
        date: p.created_at,
        description,
        change: -Number(p.amount),
        ticketId: num ? (p.ticket_id ?? undefined) : undefined,
        ticketNumber: num,
        device: num && p.ticket_id != null ? ticketDevice.get(p.ticket_id) : undefined,
      });
    }

    // A ticket becomes a charge against the balance once it is ready/issued —
    // dated by when it first reached that status, not when it was created.
    for (const t of tickets) {
      if (t.status !== "ready" && t.status !== "issued") continue;
      rows.push({
        date: readyAt[t.id] ?? t.created_at,
        description: fmt(T.contactCard.balance.ticketReady, { num: t.number }),
        change: Number(t.price ?? 0),
        ticketId: t.id,
        ticketNumber: t.number,
        device: ticketDevice.get(t.id),
      });
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [payments, tickets, readyAt]);

  const cols = useMemo<ColumnDef<Event, any>[]>(
    () => [
      {
        accessorKey: "date",
        header: T.contactCard.balance.dateTime,
        cell: (c) => formatDateTime(c.row.original.date),
      },
      {
        accessorKey: "description",
        header: T.contactCard.balance.descriptionCol,
        cell: (c) => {
          const { description, ticketId, ticketNumber, device } = c.row.original;
          if (ticketId == null || !ticketNumber) return description;
          const i = description.indexOf(ticketNumber);
          if (i === -1) return description;
          return (
            <>
              {description.slice(0, i)}
              <Link
                href={`/workflows/${ticketId}`}
                style={{ color: "#1976d2", textDecoration: "none" }}
              >
                {ticketNumber}
              </Link>
              {device ? ` (${device})` : ""}
              {description.slice(i + ticketNumber.length)}
            </>
          );
        },
      },
      {
        accessorKey: "change",
        header: T.contactCard.balance.change,
        cell: (c) => {
          const v = c.row.original.change;
          if (v === null) return "—";
          return (
            <Typography variant="body2" color={v < 0 ? "error" : "success.main"}>
              {v > 0 ? "+" : ""}
              {money(v)}
            </Typography>
          );
        },
      },
    ],
    [money],
  );

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: "flex", alignItems: "center" }}>
        <Box>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {T.contactCard.balance.description}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {T.contactCard.balance.balance}
          </Typography>
          <Typography variant="h6" sx={{
            fontWeight: 700
          }}>
            {money(balance)}
          </Typography>
          <Typography variant="caption" color={balance === 0 ? "success.main" : "text.secondary"}>
            {balance === 0 ? T.contactCard.balance.settled : ""}
          </Typography>
        </Box>
      </Paper>
      <Stack direction="row" spacing={1.5} sx={{
        mb: 1.5
      }}>
        <Button variant="contained" color="success" onClick={() => setDialog("advance")}>
          {T.contactCard.balance.addAdvance}
        </Button>
        <Button variant="contained" color="error" onClick={() => setDialog("payout")}>
          {T.contactCard.balance.addPayout}
        </Button>
        <Button variant="outlined" onClick={() => setDialog("correction")}>
          {T.contactCard.balance.addCorrection}
        </Button>
      </Stack>
      <DataTable data={events} columns={cols} dense maxHeight={420} emptyText={T.contactCard.balance.noEvents} storageKey="contact-balance" />
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
