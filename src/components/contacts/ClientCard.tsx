"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Box, Button, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import GeneralTab from "@/components/contacts/tabs/GeneralTab";
import BalanceTab from "@/components/contacts/tabs/BalanceTab";
import TicketsTab from "@/components/contacts/tabs/TicketsTab";
import DevicesTab from "@/components/contacts/tabs/DevicesTab";
import DocumentsTab from "@/components/contacts/tabs/DocumentsTab";
import { T } from "@/lib/constants";
import type {
  Contact,
  ContactDocument,
  ContactPhone,
  Payment,
  TicketRow,
} from "@/lib/types";

export default function ClientCard({
  contact,
  balance,
  payments,
  tickets,
  phones,
  documents,
  embedded = false,
}: {
  contact: Contact;
  balance: number;
  payments: Payment[];
  tickets: TicketRow[];
  phones: ContactPhone[];
  documents: ContactDocument[];
  embedded?: boolean;
}) {
  const [tab, setTab] = useState(0);
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

  // The active savable tab registers its save handler here so the single
  // shared SAVE button in the footer drives whichever tab is open.
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const [canSave, setCanSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const registerSave = useCallback((fn: (() => Promise<void>) | null) => {
    saveRef.current = fn;
    setCanSave(!!fn);
  }, []);

  async function handleSave() {
    if (!saveRef.current) return;
    setSaving(true);
    try {
      await saveRef.current();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          flexWrap: "wrap",
          rowGap: 1,
          mb: 2,
          pr: embedded ? 4 : 0,
        }}>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>
          {fullName}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {!embedded && (
          <Link href="/contacts" style={{ color: "#1976d2", textDecoration: "none" }}>
            ← До списку
          </Link>
        )}
      </Stack>
      <Paper
        variant={embedded ? "outlined" : "elevation"}
        sx={{
          height: { xs: "auto", md: "min(880px, calc(100vh - 170px))" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 2, borderBottom: "1px solid #eee", flexShrink: 0 }}
        >
          <Tab label={T.contactCard.tabs.general} />
          <Tab label={T.contactCard.tabs.balance} />
          <Tab label={T.contactCard.tabs.tickets} />
          <Tab label={T.contactCard.tabs.devices} />
          <Tab label={T.contactCard.tabs.documents} />
        </Tabs>
        <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, p: 2 }}>
          {tab === 0 && <GeneralTab contact={contact} phones={phones} registerSave={registerSave} />}
          {tab === 1 && (
            <BalanceTab
              contactId={contact.id}
              balance={balance}
              payments={payments}
              tickets={tickets}
            />
          )}
          {tab === 2 && <TicketsTab clientId={contact.id} tickets={tickets} />}
          {tab === 3 && <DevicesTab tickets={tickets} />}
          {tab === 4 && <DocumentsTab contactId={contact.id} documents={documents} />}
        </Box>
        {canSave && (
          <Box
            sx={{
              p: 2,
              borderTop: "1px solid #eee",
              display: "flex",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {T.common.save}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
