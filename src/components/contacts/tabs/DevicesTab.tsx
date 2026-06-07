"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Box } from "@mui/material";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import type { TicketRow } from "@/lib/types";

// A device the client owns, derived from one of their tickets.
interface DeviceRow {
  ticketId: number;
  ticketNumber: string;
  group: string;
  device: string;
  snImei: string;
}

function deviceName(t: TicketRow) {
  return [t.brand?.name, t.model?.name, t.modification?.name].filter(Boolean).join(" ");
}

// Devices are not stored per-contact; they live on the client's tickets.
// This tab lists the device of each ticket that has one, linking back to it.
export default function DevicesTab({ tickets }: { tickets: TicketRow[] }) {
  const rows = useMemo<DeviceRow[]>(
    () =>
      tickets
        .filter((t) => t.group_id || t.brand_id || t.model_id || t.sn_imei)
        .map((t) => ({
          ticketId: t.id,
          ticketNumber: t.number,
          group: t.group?.name ?? "—",
          device: deviceName(t) || "—",
          snImei: t.sn_imei ?? "—",
        })),
    [tickets],
  );

  const cols = useMemo<ColumnDef<DeviceRow, any>[]>(
    () => [
      { accessorKey: "group", header: "Група" },
      { accessorKey: "device", header: "Пристрій" },
      { accessorKey: "snImei", header: "SN / IMEI" },
      {
        accessorKey: "ticketNumber",
        header: "Заявка",
        cell: (c) => (
          <Link
            href={`/workflows/${c.row.original.ticketId}`}
            style={{ color: "#1976d2", fontWeight: 600, textDecoration: "none" }}
          >
            {c.row.original.ticketNumber}
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <DataTable data={rows} columns={cols} dense emptyText="Немає пристроїв" />
    </Box>
  );
}
