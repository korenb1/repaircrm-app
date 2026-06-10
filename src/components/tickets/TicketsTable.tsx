"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Button, Chip, Collapse, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FilterListIcon from "@mui/icons-material/FilterList";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import SummaryCards from "@/components/ui/SummaryCards";
import UserAvatar from "@/components/ui/UserAvatar";
import TechnicianAvatars, { type Tech } from "@/components/ui/TechnicianAvatars";
import CreateTicketDialog from "@/components/tickets/CreateTicketDialog";
import TicketFilterPanel, {
  type EntityOption,
  type FilterOptions,
} from "@/components/tickets/TicketFilterPanel";
import SaveFilterDialog from "@/components/tickets/SaveFilterDialog";
import { createClient } from "@/lib/supabase/client";
import { useTerminalKeys } from "@/lib/status-context";
import { filterIcon } from "@/lib/filterIcons";
import { inPreset } from "@/lib/datePresets";
import { T } from "@/lib/constants";
import { formatUAH, formatDateTime, relativeDue } from "@/lib/money";
import type { FilterCriteria, TicketFilter, TicketRow } from "@/lib/types";

// Distinct {id,name} options from rows for one accessor, sorted by name.
function distinct(
  rows: TicketRow[],
  pick: (r: TicketRow) => EntityOption | null,
): EntityOption[] {
  const map = new Map<string | number, EntityOption>();
  for (const r of rows) {
    const o = pick(r);
    if (o && o.name && !map.has(o.id)) map.set(o.id, o);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Any criterion present (non-empty array or a real date preset)?
function hasCriteria(c: FilterCriteria): boolean {
  return (
    !!c.status?.length ||
    !!c.group?.length ||
    !!c.brand?.length ||
    !!c.model?.length ||
    !!c.client?.length ||
    !!c.manager?.length ||
    !!c.technician?.length ||
    (!!c.created && c.created !== "all")
  );
}

// OR within a category: empty list = no constraint.
function inList<T>(arr: T[] | undefined, value: T | null | undefined): boolean {
  if (!arr || arr.length === 0) return true;
  return value != null && arr.includes(value);
}

function clientName(c: TicketRow["client"]) {
  if (!c) return "";
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

// Unique technicians for a ticket: gathered from its line items; falls back to
// the ticket-level technician when no line has one assigned.
function rowTechs(r: TicketRow): Tech[] {
  const map = new Map<string, Tech>();
  for (const it of r.items ?? []) {
    const t = it.technician;
    if (t && !map.has(t.id))
      map.set(t.id, { id: t.id, name: t.full_name, avatarPath: t.avatar_path });
  }
  if (map.size === 0 && r.technician)
    map.set(r.technician.id, {
      id: r.technician.id,
      name: r.technician.full_name,
      avatarPath: r.technician.avatar_path,
    });
  return [...map.values()];
}

export default function TicketsTable({
  rows,
  currentUserId,
  savedFilters = [],
}: {
  rows: TicketRow[];
  currentUserId: string | null;
  savedFilters?: TicketFilter[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  // capture wall-clock once at mount; reading it during render is impure
  const [now] = useState(() => Date.now());
  const terminalKeys = useTerminalKeys();

  // Filter state
  const [panelOpen, setPanelOpen] = useState(false);
  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [activeFilterId, setActiveFilterId] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [filters, setFilters] = useState<TicketFilter[]>(savedFilters);

  // Brand options are restricted to the selected group(s); model options to the
  // selected brand(s) — cascading so you only pick brands/models that exist
  // under the upstream choice.
  const filterOptions = useMemo<FilterOptions>(() => {
    const brandRows = rows.filter(
      (r) =>
        !criteria.group?.length ||
        (r.group_id != null && criteria.group.includes(r.group_id)),
    );
    const modelRows = brandRows.filter(
      (r) =>
        !criteria.brand?.length ||
        (r.brand_id != null && criteria.brand.includes(r.brand_id)),
    );
    return {
      group: distinct(rows, (r) =>
        r.group_id ? { id: r.group_id, name: r.group?.name ?? "" } : null,
      ),
      brand: distinct(brandRows, (r) =>
        r.brand_id ? { id: r.brand_id, name: r.brand?.name ?? "" } : null,
      ),
      model: distinct(modelRows, (r) =>
        r.model_id ? { id: r.model_id, name: r.model?.name ?? "" } : null,
      ),
      client: distinct(rows, (r) =>
        r.client ? { id: r.client.id, name: clientName(r.client) } : null,
      ),
      manager: distinct(rows, (r) =>
        r.manager ? { id: r.manager.id, name: r.manager.full_name } : null,
      ),
      technician: distinct(rows, (r) =>
        r.technician ? { id: r.technician.id, name: r.technician.full_name } : null,
      ),
    };
  }, [rows, criteria.group, criteria.brand]);

  // Toggle a saved filter on/off without opening the category panel.
  function applyFilter(f: TicketFilter) {
    if (activeFilterId === f.id) {
      resetFilter();
      return;
    }
    setCriteria(f.criteria ?? {});
    setActiveFilterId(f.id);
  }

  function resetFilter() {
    setCriteria({});
    setActiveFilterId(null);
  }

  function onCriteriaChange(next: FilterCriteria) {
    const cleaned: FilterCriteria = { ...next };
    // Cascading: changing a group clears downstream brand+model; changing a
    // brand clears model — they may no longer be valid under the new parent.
    const groupChanged =
      JSON.stringify(next.group ?? []) !== JSON.stringify(criteria.group ?? []);
    const brandChanged =
      JSON.stringify(next.brand ?? []) !== JSON.stringify(criteria.brand ?? []);
    if (groupChanged) {
      cleaned.brand = [];
      cleaned.model = [];
    } else if (brandChanged) {
      cleaned.model = [];
    }
    setCriteria(cleaned);
    setActiveFilterId(null); // editing detaches from a saved filter
  }

  async function deleteFilter() {
    if (activeFilterId == null) return;
    await supabase.from("ticket_filters").delete().eq("id", activeFilterId);
    setFilters((prev) => prev.filter((f) => f.id !== activeFilterId));
    resetFilter();
    router.refresh();
  }

  const activeFilter = filters.find((f) => f.id === activeFilterId) ?? null;
  const canDelete = !!activeFilter && activeFilter.owner_id === currentUserId;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        ![
          r.number,
          r.group?.name,
          r.brand?.name,
          r.model?.name,
          r.sn_imei,
          r.malfunction,
          clientName(r.client),
          r.client?.phone,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
        return false;

      // Structured criteria: AND across categories, OR within each.
      const techIds = rowTechs(r).map((t) => t.id);
      return (
        inList(criteria.status, r.status) &&
        inList(criteria.group, r.group_id) &&
        inList(criteria.brand, r.brand_id) &&
        inList(criteria.model, r.model_id) &&
        inList(criteria.client, r.client?.id) &&
        inList(criteria.manager, r.manager?.id) &&
        (!criteria.technician?.length ||
          techIds.some((id) => criteria.technician!.includes(id))) &&
        inPreset(r.created_at, criteria.created, now)
      );
    });
  }, [rows, search, criteria, now]);

  const summary = useMemo(() => {
    let mine = 0,
      overdue = 0,
      receivable = 0;
    for (const r of rows) {
      if (currentUserId && r.technician_id === currentUserId) mine++;
      if (
        r.due_date &&
        new Date(r.due_date).getTime() < now &&
        !terminalKeys.has(r.status)
      )
        overdue++;
      receivable += Math.max(0, (r.price ?? 0) - (r.paid ?? 0));
    }
    return { mine, overdue, receivable };
  }, [rows, currentUserId, now, terminalKeys]);

  const cols = useMemo<ColumnDef<TicketRow, any>[]>(
    () => [
      {
        accessorKey: "number",
        header: T.workflows.cols.number,
        size: 90,
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
        size: 130,
        cell: (c) => (
          <StatusBadge ticketId={c.row.original.id} status={c.row.original.status} />
        ),
      },
      {
        id: "group",
        header: T.workflows.cols.group,
        size: 110,
        accessorFn: (r) => r.group?.name ?? "",
      },
      {
        id: "device",
        header: T.workflows.cols.device,
        size: 180,
        accessorFn: (r) =>
          [r.brand?.name, r.model?.name].filter(Boolean).join(" "),
        cell: (c) => {
          const r = c.row.original;
          const label = [r.brand?.name, r.model?.name].filter(Boolean).join(" ");
          return (
          <Box>
            <Typography variant="body2">{label || "—"}</Typography>
            {c.row.original.sn_imei && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {c.row.original.sn_imei}
              </Typography>
            )}
          </Box>
          );
        },
      },
      {
        accessorKey: "malfunction",
        header: T.workflows.cols.malfunction,
        size: 240,
        cell: (c) => (
          <Box sx={{ maxWidth: 220 }}>
            <Typography variant="body2">{c.row.original.malfunction ?? "—"}</Typography>
          </Box>
        ),
      },
      {
        id: "client",
        header: T.workflows.cols.client,
        size: 180,
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
        id: "manager",
        header: T.workflows.cols.manager,
        size: 140,
        accessorFn: (r) => r.manager?.full_name ?? "",
        cell: (c) => {
          const m = c.row.original.manager;
          return m ? (
            <UserAvatar name={m.full_name} avatarPath={m.avatar_path} />
          ) : (
            "—"
          );
        },
      },
      {
        id: "technician",
        header: T.workflows.cols.technician,
        size: 140,
        accessorFn: (r) => rowTechs(r).map((t) => t.name).join(", "),
        cell: (c) => <TechnicianAvatars techs={rowTechs(c.row.original)} />,
      },
      {
        accessorKey: "est_price",
        header: T.workflows.cols.estPrice,
        size: 110,
        cell: (c) => formatUAH(c.row.original.est_price),
      },
      {
        id: "price",
        header: T.workflows.cols.price,
        size: 110,
        accessorFn: (r) => r.price ?? 0,
        cell: (c) => formatUAH(c.row.original.price),
      },
      {
        id: "paid",
        header: T.workflows.cols.paid,
        size: 110,
        accessorFn: (r) => r.paid ?? 0,
        cell: (c) => formatUAH(c.row.original.paid),
      },
      {
        id: "due",
        header: T.workflows.cols.due,
        size: 160,
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
        <Button
          variant={panelOpen ? "contained" : "outlined"}
          color={panelOpen ? "primary" : "inherit"}
          startIcon={<FilterListIcon />}
          onClick={() => setPanelOpen((v) => !v)}
        >
          {T.workflows.filters.filter}
        </Button>
        {filters.map((f) => {
          const Icon = filterIcon(f.icon);
          const active = f.id === activeFilterId;
          return (
            <Chip
              key={f.id}
              icon={<Icon />}
              label={f.name}
              variant={active ? "filled" : "outlined"}
              color={active ? "primary" : "default"}
              onClick={() => applyFilter(f)}
            />
          );
        })}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Всього — {filtered.length}
        </Typography>
      </Stack>
      <Collapse in={panelOpen} unmountOnExit>
        <Box sx={{ borderBottom: "1px solid #eee", mb: 1.5 }}>
          <TicketFilterPanel
            options={filterOptions}
            criteria={criteria}
            onChange={onCriteriaChange}
          />
          {hasCriteria(criteria) && (
            <Stack direction="row" spacing={1.5} sx={{ pb: 2 }}>
              <Button variant="outlined" onClick={resetFilter}>
                {T.workflows.filters.reset}
              </Button>
              {activeFilterId == null ? (
                <Button variant="contained" onClick={() => setSaveOpen(true)}>
                  {T.workflows.filters.create}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  onClick={deleteFilter}
                  disabled={!canDelete}
                >
                  {T.workflows.filters.delete}
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Collapse>
      <DataTable data={filtered} columns={cols} dense storageKey="tickets" />
      <CreateTicketDialog open={open} onClose={() => setOpen(false)} />
      <SaveFilterDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        criteria={criteria}
        onSaved={(f) => {
          setFilters((prev) => [...prev, f]);
          setActiveFilterId(f.id);
        }}
      />
    </Box>
  );
}
