"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Box } from "@mui/material";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import { useT } from "@/lib/i18n/context";
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
  const T = useT();
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
      { accessorKey: "group", header: T.contactCard.devices.group },
      { accessorKey: "device", header: T.contactCard.devices.device },
      { accessorKey: "snImei", header: T.contactCard.devices.snImei },
      {
        accessorKey: "ticketNumber",
        header: T.contactCard.devices.ticket,
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
    [T],
  );

  return (
    <Box>
      <DataTable data={rows} columns={cols} dense emptyText={T.contactCard.devices.noDevices} storageKey="contact-devices" />
    </Box>
  );
}
