"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Box, Button, Chip, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import CreateContactDialog from "@/components/contacts/CreateContactDialog";
import { useT, useMoney } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n";
import type { Contact } from "@/lib/types";

type Row = Contact & { balance: number };

function fullName(c: Contact) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

export default function ContactsTable({ rows }: { rows: Row[] }) {
  const T = useT();
  const money = useMoney();
  const [tab, setTab] = useState(0); // 0 = people, 1 = organizations
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const type = tab === 0 ? "person" : "organization";
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => r.type === type)
      .filter((r) =>
        !q
          ? true
          : [fullName(r), r.phone, r.email, r.note]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
      );
  }, [rows, tab, search]);

  // All tags used across contacts, for the create dialog's suggestions.
  const tagOptions = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.tags ?? []))).sort(),
    [rows],
  );

  const cols = useMemo<ColumnDef<Row, any>[]>(
    () => [
      {
        id: "name",
        header: T.contacts.cols.name,
        accessorFn: (r) => fullName(r),
        cell: (c) => (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
            <Link
              href={`/contacts/${c.row.original.id}`}
              style={{ color: "#1976d2", fontWeight: 600, textDecoration: "none" }}
            >
              {fullName(c.row.original)}
            </Link>
            {(c.row.original.tags ?? []).map((t) => (
              <Chip key={t} label={t} size="small" variant="outlined" />
            ))}
          </Stack>
        ),
      },
      {
        accessorKey: "email",
        header: T.contacts.cols.email,
        cell: (c) => c.row.original.email ?? "",
      },
      {
        accessorKey: "phone",
        header: T.contacts.cols.phone,
        cell: (c) => c.row.original.phone ?? "",
      },
      {
        accessorKey: "address",
        header: T.contacts.cols.address,
        cell: (c) => c.row.original.address ?? "",
      },
      {
        accessorKey: "note",
        header: T.contacts.cols.note,
        cell: (c) => c.row.original.note ?? "",
      },
      {
        id: "balance",
        header: T.contacts.cols.balance,
        accessorFn: (r) => r.balance,
        cell: (c) => money(c.row.original.balance),
      },
    ],
    [T, money],
  );

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 1 }}
      >
        <Tab label={T.contacts.people} />
        <Tab label={T.contacts.organizations} />
      </Tabs>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          mb: 1.5,
          alignItems: "center"
        }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          {T.contacts.newContact}
        </Button>
        <TextField
          size="small"
          placeholder={T.common.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {fmt(T.common.totalCount, { count: filtered.length })}
        </Typography>
      </Stack>
      <DataTable data={filtered} columns={cols} dense storageKey="contacts" />
      <CreateContactDialog
        open={open}
        onClose={() => setOpen(false)}
        defaultType={tab === 0 ? "person" : "organization"}
        tagOptions={tagOptions}
      />
    </Box>
  );
}
