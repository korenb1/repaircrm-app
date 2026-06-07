"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Box, Button, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import StatusBadge from "@/components/ui/StatusBadge";
import GeneralTab from "@/components/tickets/tabs/GeneralTab";
import ItemsTab from "@/components/tickets/tabs/ItemsTab";
import InvoicesTab from "@/components/tickets/tabs/InvoicesTab";
import TicketTimeline from "@/components/tickets/TicketTimeline";
import { T } from "@/lib/constants";
import { formatUAH } from "@/lib/money";
import type {
  Invoice,
  Payment,
  Profile,
  ServiceCatalogItem,
  TicketEventRow,
  TicketItem,
  TicketRow,
} from "@/lib/types";

// Fixed card body height so switching tabs never reflows the layout; the
// inner content scrolls instead. Roughly matches the create-ticket dialog.
const CARD_H = { xs: "auto", md: "min(880px, calc(100vh - 170px))" } as const;

// Header/footer heights are shared with TicketTimeline so the left-column and
// right-column dividers line up horizontally across the card.
const HEADER_H = 52;
const FOOTER_H = 69;

export default function TicketCard({
  ticket,
  items,
  invoices,
  payments,
  profiles,
  catalog,
  events,
  embedded = false,
}: {
  ticket: TicketRow;
  items: TicketItem[];
  invoices: Invoice[];
  payments: Payment[];
  profiles: Profile[];
  catalog: ServiceCatalogItem[];
  events: TicketEventRow[];
  embedded?: boolean;
}) {
  const [tab, setTab] = useState(0);

  // The active savable tab registers its save handler here so the single
  // shared SAVE button in the footer drives whichever tab is open. Tabs
  // without a save (e.g. invoices) leave this null and the button hides.
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

  const paid = payments
    .filter((p) => p.kind === "payment" || p.kind === "prepayment")
    .reduce((s, p) => s + Number(p.amount), 0);

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
          Заявка №{ticket.number}
        </Typography>
        <StatusBadge ticketId={ticket.id} status={ticket.status} />
        <Box sx={{ flexGrow: 1 }} />
        {!embedded && (
          <Link href="/workflows" style={{ color: "#1976d2", textDecoration: "none" }}>
            ← До списку
          </Link>
        )}
      </Stack>

      <Paper
        variant={embedded ? "outlined" : "elevation"}
        sx={{
          height: CARD_H,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          overflow: "hidden",
        }}
      >
        {/* left: tabs + scrollable content + pinned totals footer */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              px: 2,
              borderBottom: "1px solid #eee",
              flexShrink: 0,
              minHeight: HEADER_H,
              "& .MuiTab-root": { minHeight: HEADER_H },
            }}
          >
            <Tab label={T.ticket.tabs.general} />
            <Tab label={T.ticket.tabs.items} />
            <Tab label={T.ticket.tabs.invoices} />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0, p: 2 }}>
            {tab === 0 && (
              <GeneralTab ticket={ticket} profiles={profiles} registerSave={registerSave} />
            )}
            {tab === 1 && (
              <ItemsTab
                ticketId={ticket.id}
                items={items}
                profiles={profiles}
                catalog={catalog}
                conclusion={ticket.conclusion}
                registerSave={registerSave}
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
              px: 2,
              minHeight: FOOTER_H,
              borderTop: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
          >
            <Stack direction="row" sx={{ alignItems: "baseline" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Оплачено:&nbsp;
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {formatUAH(paid)}
              </Typography>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            {canSave && (
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {T.common.save}
              </Button>
            )}
          </Box>
        </Box>

        {/* right: always-visible activity timeline */}
        <Box
          sx={{
            width: { xs: "100%", md: 360 },
            height: { xs: 360, md: "auto" },
            flexShrink: 0,
            minHeight: 0,
            display: "flex",
            borderLeft: { md: "1px solid #eee" },
            borderTop: { xs: "1px solid #eee", md: "none" },
          }}
        >
          <TicketTimeline ticketId={ticket.id} events={events} />
        </Box>
      </Paper>
    </Box>
  );
}
