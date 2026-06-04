"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import SummaryCards from "@/components/ui/SummaryCards";
import CreateTicketDialog from "@/components/tickets/CreateTicketDialog";
import { T } from "@/lib/constants";
import { formatUAH, formatDateTime, relativeDue } from "@/lib/money";
import type { TicketRow } from "@/lib/types";

function clientName(c: TicketRow["client"]) {
  if (!c) return "";
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

export default function TicketsTable({
  rows,
  currentUserId,
}: {
  rows: TicketRow[];
  currentUserId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  // capture wall-clock once at mount; reading it during render is impure
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.number,
        r.group?.name,
        r.model?.name,
        r.sn_imei,
        r.malfunction,
        clientName(r.client),
        r.client?.phone,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    let mine = 0,
      overdue = 0,
      receivable = 0;
    for (const r of rows) {
      if (currentUserId && r.technician_id === currentUserId) mine++;
      if (
        r.due_date &&
        new Date(r.due_date).getTime() < now &&
        r.status !== "issued" &&
        r.status !== "return_no_repair"
      )
        overdue++;
      receivable += Math.max(0, (r.price ?? 0) - (r.paid ?? 0));
    }
    return { mine, overdue, receivable };
  }, [rows, currentUserId, now]);

  const cols = useMemo<ColumnDef<TicketRow, any>[]>(
    () => [
      {
        accessorKey: "number",
        header: T.workflows.cols.number,
        cell: (c) => (
          <Link
            href={`/workflows/${c.row.original.id}`}
            style={{ color: "#1976d2", fontWeight: 600, textDecoration: "none" }}
          >
            {c.row.original.number}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: T.workflows.cols.status,
        cell: (c) => (
          <StatusBadge ticketId={c.row.original.id} status={c.row.original.status} />
        ),
      },
      {
        id: "group",
        header: T.workflows.cols.group,
        accessorFn: (r) => r.group?.name ?? "",
      },
      {
        id: "device",
        header: T.workflows.cols.device,
        cell: (c) => (
          <Box>
            <Typography variant="body2">{c.row.original.model?.name ?? "—"}</Typography>
            {c.row.original.sn_imei && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {c.row.original.sn_imei}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        accessorKey: "malfunction",
        header: T.workflows.cols.malfunction,
        cell: (c) => (
          <Box sx={{ maxWidth: 220 }}>
            <Typography variant="body2">{c.row.original.malfunction ?? "—"}</Typography>
          </Box>
        ),
      },
      {
        id: "client",
        header: T.workflows.cols.client,
        accessorFn: (r) => clientName(r.client),
        cell: (c) => {
          const cl = c.row.original.client;
          if (!cl) return "—";
          return (
            <Box>
              <Link
                href={`/contacts/${cl.id}`}
                style={{ color: "#1976d2", textDecoration: "none" }}
              >
                {clientName(cl)}
              </Link>
              {cl.phone && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block"
                  }}>
                  {cl.phone}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        id: "created",
        header: T.workflows.cols.created,
        accessorFn: (r) => r.created_at,
        cell: (c) => (
          <Box>
            <Typography variant="body2">
              {c.row.original.manager?.full_name ?? "—"}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {formatDateTime(c.row.original.created_at)}
            </Typography>
          </Box>
        ),
      },
      {
        id: "technician",
        header: T.workflows.cols.technician,
        accessorFn: (r) => r.technician?.full_name ?? "",
      },
      {
        accessorKey: "est_price",
        header: T.workflows.cols.estPrice,
        cell: (c) => formatUAH(c.row.original.est_price),
      },
      {
        id: "price",
        header: T.workflows.cols.price,
        accessorFn: (r) => r.price ?? 0,
        cell: (c) => formatUAH(c.row.original.price),
      },
      {
        id: "paid",
        header: T.workflows.cols.paid,
        accessorFn: (r) => r.paid ?? 0,
        cell: (c) => formatUAH(c.row.original.paid),
      },
      {
        id: "due",
        header: T.workflows.cols.due,
        accessorFn: (r) => r.due_date ?? "",
        cell: (c) => {
          const d = relativeDue(c.row.original.due_date);
          return (
            <Box>
              <Stack direction="row" spacing={0.5} sx={{
                alignItems: "center"
              }}>
                <Typography
                  variant="body2"
                  color={d.overdue ? "error" : "text.primary"}
                >
                  {d.relative}
                </Typography>
                {d.overdue && <AccessTimeIcon color="error" sx={{ fontSize: 14 }} />}
              </Stack>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {d.absolute}
              </Typography>
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 2
        }}>
        {T.workflows.title}
      </Typography>
      <SummaryCards
        mine={summary.mine}
        overdue={summary.overdue}
        receivable={summary.receivable}
      />
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          mb: 1.5,
          alignItems: "center"
        }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          {T.workflows.newTicket}
        </Button>
        <TextField
          size="small"
          placeholder={T.workflows.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Всього — {filtered.length}
        </Typography>
      </Stack>
      <DataTable data={filtered} columns={cols} dense />
      <CreateTicketDialog open={open} onClose={() => setOpen(false)} />
    </Box>
  );
}
