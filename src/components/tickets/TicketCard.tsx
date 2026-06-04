"use client";
import { useState } from "react";
import Link from "next/link";
import { Box, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import StatusBadge from "@/components/ui/StatusBadge";
import GeneralTab from "@/components/tickets/tabs/GeneralTab";
import ItemsTab from "@/components/tickets/tabs/ItemsTab";
import InvoicesTab from "@/components/tickets/tabs/InvoicesTab";
import { T } from "@/lib/constants";
import { formatUAH } from "@/lib/money";
import type {
  Invoice,
  Payment,
  Profile,
  ServiceCatalogItem,
  TicketItem,
  TicketRow,
} from "@/lib/types";

export default function TicketCard({
  ticket,
  items,
  invoices,
  payments,
  profiles,
  catalog,
}: {
  ticket: TicketRow;
  items: TicketItem[];
  invoices: Invoice[];
  payments: Payment[];
  profiles: Profile[];
  catalog: ServiceCatalogItem[];
}) {
  const [tab, setTab] = useState(0);

  const paid = payments
    .filter((p) => p.kind === "payment" || p.kind === "prepayment")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Заявка №{ticket.number}
        </Typography>
        <StatusBadge ticketId={ticket.id} status={ticket.status} />
        <Box sx={{ flexGrow: 1 }} />
        <Link href="/workflows" style={{ color: "#1976d2", textDecoration: "none" }}>
          ← До списку
        </Link>
      </Stack>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label={T.ticket.tabs.general} />
          <Tab label={T.ticket.tabs.items} />
          <Tab label={T.ticket.tabs.invoices} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <GeneralTab ticket={ticket} profiles={profiles} />}
          {tab === 1 && (
            <ItemsTab
              ticketId={ticket.id}
              items={items}
              profiles={profiles}
              catalog={catalog}
              technicianNotes={ticket.technician_notes}
              conclusion={ticket.conclusion}
            />
          )}
          {tab === 2 && (
            <InvoicesTab
              ticketId={ticket.id}
              clientId={ticket.client_id}
              invoices={invoices}
              payments={payments}
            />
          )}
        </Box>
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Оплачено:&nbsp;
          </Typography>
          <Typography variant="body1" fontWeight={700}>
            {formatUAH(paid)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
