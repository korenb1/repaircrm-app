"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnSizingState,
  type ExpandedState,
  type Header,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useT } from "@/lib/i18n/context";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Paper,
  Typography,
} from "@mui/material";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  emptyText?: string;
  maxHeight?: number | string;
  dense?: boolean;
  /** rows per page; pagination only shows when data exceeds it. Default 50. */
  pageSize?: number;
  /** when set, column order + sizes persist in localStorage under this key. */
  storageKey?: string;
  /** when set, rows become a tree; return a row's children (or undefined for leaves). */
  getSubRows?: (row: T) => T[] | undefined;
  /** stable row id (needed to key expansion state to specific rows). */
  getRowId?: (row: T, index: number, parent?: { id: string }) => string;
  /** initial expansion when getSubRows is set. Default true (all expanded). */
  defaultExpanded?: ExpandedState;
}

// Stable id for a column def (matches tanstack's own derivation).
function colId<T>(c: ColumnDef<T, any>): string {
  return (c.id ?? (c as { accessorKey?: string }).accessorKey ?? "") as string;
}

// A draggable + resizable header cell, reordered via dnd-kit.
function SortableHeader<T>({ header }: { header: Header<T, unknown> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: header.column.id });
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();

  return (
    <TableCell
      ref={setNodeRef}
      sx={{
        whiteSpace: "nowrap",
        fontWeight: 600,
        width: header.getSize(),
        position: "relative",
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ display: "inline-flex", alignItems: "center", cursor: "grab" }}
      >
        {header.isPlaceholder ? null : canSort ? (
          <TableSortLabel
            active={Boolean(sorted)}
            direction={sorted === "desc" ? "desc" : "asc"}
            onClick={header.column.getToggleSortingHandler()}
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </TableSortLabel>
        ) : (
          flexRender(header.column.columnDef.header, header.getContext())
        )}
      </Box>
      {header.column.getCanResize() && (
        <Box
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: "6px",
            cursor: "col-resize",
            userSelect: "none",
            touchAction: "none",
            "&:hover": { bgcolor: "primary.main", opacity: 0.4 },
          }}
        />
      )}
    </TableCell>
  );
}

export default function DataTable<T>({
  data,
  columns,
  emptyText,
  maxHeight = "calc(100vh - 230px)",
  dense = false,
  pageSize = 50,
  storageKey,
  getSubRows,
  getRowId,
  defaultExpanded = true,
}: DataTableProps<T>) {
  const T = useT();
  const resolvedEmptyText = emptyText ?? T.common.noData;
  const initialOrder = useMemo(() => columns.map(colId), [columns]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>(initialOrder);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [expanded, setExpanded] = useState<ExpandedState>(defaultExpanded);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const hydrated = useRef(false);

  // Load persisted order + sizes from browser storage after mount (per-browser,
  // not in the DB — like RemOnline's per-machine column layout).
  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(`dt:${storageKey}`);
        if (raw) {
          const saved = JSON.parse(raw) as { order?: string[]; sizing?: ColumnSizingState };
          if (saved.order?.length) {
            // keep only ids that still exist, append any new columns
            const valid = saved.order.filter((id) => initialOrder.includes(id));
            const merged = [...valid, ...initialOrder.filter((id) => !valid.includes(id))];
            setColumnOrder(merged);
          }
          if (saved.sizing) setColumnSizing(saved.sizing);
        }
      } catch {
        /* ignore corrupt storage */
      }
    }
    hydrated.current = true;
  }, [storageKey, initialOrder]);

  // Persist on change (skip the first run before hydration so we don't clobber).
  useEffect(() => {
    if (!hydrated.current || !storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `dt:${storageKey}`,
        JSON.stringify({ order: columnOrder, sizing: columnSizing }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [storageKey, columnOrder, columnSizing]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnOrder, columnSizing, expanded, pagination },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    defaultColumn: { minSize: 60, size: 160 },
    getSubRows,
    getRowId,
    getRowCanExpand: getSubRows ? (row) => row.subRows.length > 0 : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const order = table.getAllLeafColumns().map((c) => c.id);
    const from = order.indexOf(active.id as string);
    const to = order.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    setColumnOrder(arrayMove(order, from, to));
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const rowHeight = dense ? 45 : 57;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = items.length ? items[0].start : 0;
  const paddingBottom = items.length ? totalSize - items[items.length - 1].end : 0;
  const leafCount = table.getVisibleLeafColumns().length;

  const totalRows = table.getFilteredRowModel().rows.length;
  const showPagination = totalRows > pagination.pageSize;
  const headerIds = table.getVisibleLeafColumns().map((c: Column<T>) => c.id);
  const hasFooter = columns.some((c) => c.footer != null);

  return (
    <Box>
      <DndContext
        sensors={sensors}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
      >
        <TableContainer ref={containerRef} component={Paper} sx={{ maxHeight, width: "100%" }}>
          <Table
            stickyHeader
            size={dense ? "small" : "medium"}
            sx={{ width: "100%", minWidth: table.getTotalSize(), tableLayout: "fixed" }}
          >
            <TableHead>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  <SortableContext items={headerIds} strategy={horizontalListSortingStrategy}>
                    {hg.headers.map((header) => (
                      <SortableHeader key={header.id} header={header} />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={leafCount}>
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography sx={{ color: "text.secondary" }}>{resolvedEmptyText}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {paddingTop > 0 && (
                  <TableRow style={{ height: paddingTop }}>
                    <TableCell colSpan={leafCount} sx={{ p: 0, border: 0 }} />
                  </TableRow>
                )}
                {items.map((vi) => {
                  const row = rows[vi.index];
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      data-index={vi.index}
                      ref={(el) => virtualizer.measureElement(el)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          sx={{ verticalAlign: "top", width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {paddingBottom > 0 && (
                  <TableRow style={{ height: paddingBottom }}>
                    <TableCell colSpan={leafCount} sx={{ p: 0, border: 0 }} />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
          {hasFooter && rows.length > 0 && (
            <TableFooter
              sx={{
                position: "sticky",
                bottom: 0,
                zIndex: 2,
                bgcolor: "#f7f8fa",
              }}
            >
              {table.getFooterGroups().map((fg) => (
                <TableRow key={fg.id}>
                  {fg.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        width: header.getSize(),
                        bgcolor: "#f7f8fa",
                        borderTop: "2px solid #e0e0e0",
                        fontSize: "0.875rem",
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.footer,
                            header.getContext(),
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      </TableContainer>
      </DndContext>
      {showPagination && (
        <TablePagination
          component="div"
          count={totalRows}
          page={pagination.pageIndex}
          rowsPerPage={pagination.pageSize}
          rowsPerPageOptions={[pagination.pageSize]}
          labelRowsPerPage=""
          onPageChange={(_, p) => table.setPageIndex(p)}
          onRowsPerPageChange={() => {}}
        />
      )}
    </Box>
  );
}
