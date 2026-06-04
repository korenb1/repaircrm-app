"use client";
import { useState } from "react";
import Link from "next/link";
import { Box, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import GeneralTab from "@/components/contacts/tabs/GeneralTab";
import BalanceTab from "@/components/contacts/tabs/BalanceTab";
import TicketsTab from "@/components/contacts/tabs/TicketsTab";
import { T } from "@/lib/constants";
import type { Contact, Payment, TicketRow } from "@/lib/types";

export default function ClientCard({
  contact,
  balance,
  payments,
  tickets,
}: {
  contact: Contact;
  balance: number;
  payments: Payment[];
  tickets: TicketRow[];
}) {
  const [tab, setTab] = useState(0);
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          {fullName}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Link href="/contacts" style={{ color: "#1976d2", textDecoration: "none" }}>
          ← До списку
        </Link>
      </Stack>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label={T.contactCard.tabs.general} />
          <Tab label={T.contactCard.tabs.balance} />
          <Tab label={T.contactCard.tabs.tickets} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <GeneralTab contact={contact} />}
          {tab === 1 && (
            <BalanceTab
              contactId={contact.id}
              balance={balance}
              payments={payments}
              tickets={tickets}
            />
          )}
          {tab === 2 && <TicketsTab clientId={contact.id} tickets={tickets} />}
        </Box>
      </Paper>
    </Box>
  );
}
