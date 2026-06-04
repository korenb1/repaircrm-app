"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Box, Button, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import CreateTicketDialog from "@/components/tickets/CreateTicketDialog";
import { formatUAH, formatDateTime, relativeDue } from "@/lib/money";
import type { TicketRow } from "@/lib/types";

export default function TicketsTab({
  clientId,
  tickets,
}: {
  clientId: number;
  tickets: TicketRow[];
}) {
  const [open, setOpen] = useState(false);

  const cols = useMemo<ColumnDef<TicketRow, any>[]>(
    () => [
      {
        accessorKey: "number",
        header: "№",
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
        id: "created",
        header: "Створено",
        cell: (c) => formatDateTime(c.row.original.created_at),
      },
      {
        id: "due",
        header: "Термін",
        cell: (c) => relativeDue(c.row.original.due_date).absolute,
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: (c) => (
          <StatusBadge ticketId={c.row.original.id} status={c.row.original.status} />
        ),
      },
      {
        id: "amount",
        header: "Сума, ₴",
        cell: (c) => formatUAH(c.row.original.price),
      },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" sx={{
        mb: 1.5
      }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Заявка
        </Button>
      </Stack>
      <DataTable data={tickets} columns={cols} dense emptyText="Немає заявок" />
      <CreateTicketDialog
        open={open}
        onClose={() => setOpen(false)}
        defaultClientId={clientId}
      />
    </Box>
  );
}
