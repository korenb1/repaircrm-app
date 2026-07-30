"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import GeneralTab from "@/components/contacts/tabs/GeneralTab";
import BalanceTab from "@/components/contacts/tabs/BalanceTab";
import TicketsTab from "@/components/contacts/tabs/TicketsTab";
import DevicesTab from "@/components/contacts/tabs/DevicesTab";
import DocumentsTab from "@/components/contacts/tabs/DocumentsTab";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n";
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
  readyAt = {},
  phones,
  documents,
  embedded = false,
}: {
  contact: Contact;
  balance: number;
  payments: Payment[];
  tickets: TicketRow[];
  readyAt?: Record<number, string>;
  phones: ContactPhone[];
  documents: ContactDocument[];
  embedded?: boolean;
}) {
  const T = useT();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

  // The active savable tab registers its save handler here so the single
  // shared SAVE button in the footer drives whichever tab is open.
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const [canSave, setCanSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDelete() {
    if (!window.confirm(fmt(T.contactCard.deleteConfirm, { name: fullName }))) return;
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
    setDeleting(false);
    if (error) {
      // 23503 = foreign_key_violation — tickets/devices still reference the contact.
      setDeleteError(
        error.code === "23503"
          ? T.contactCard.deleteHasTickets
          : T.contactCard.deleteError,
      );
      return;
    }
    router.push("/contacts");
    router.refresh();
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
            {T.ticket.card.backToList}
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
              readyAt={readyAt}
            />
          )}
          {tab === 2 && <TicketsTab clientId={contact.id} tickets={tickets} />}
          {tab === 3 && <DevicesTab tickets={tickets} />}
          {tab === 4 && <DocumentsTab contactId={contact.id} documents={documents} />}
        </Box>
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
          }}
        >
          {deleteError && (
            <Alert
              severity="error"
              sx={{ py: 0, mr: "auto" }}
              onClose={() => setDeleteError(null)}
            >
              {deleteError}
            </Alert>
          )}
          <Tooltip title={T.contactCard.deleteContact}>
            <span>
              <Button
                color="error"
                variant="outlined"
                onClick={handleDelete}
                disabled={deleting || saving}
                sx={{ minWidth: 0, px: 1 }}
              >
                <DeleteIcon />
              </Button>
            </span>
          </Tooltip>
          {canSave && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || deleting}
            >
              {T.common.save}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
