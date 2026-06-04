"use client";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
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
}

export default function DataTable<T>({
  data,
  columns,
  emptyText = "Немає даних",
  maxHeight = "calc(100vh - 230px)",
  dense = false,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <TableContainer component={Paper} sx={{ maxHeight, width: "100%" }}>
      <Table stickyHeader size={dense ? "small" : "medium"} sx={{ width: "100%" }}>
        <TableHead>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableCell
                    key={header.id}
                    sx={{ whiteSpace: "nowrap", fontWeight: 600 }}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <TableSortLabel
                        active={Boolean(sorted)}
                        direction={sorted === "desc" ? "desc" : "asc"}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </TableSortLabel>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography sx={{
                    color: "text.secondary"
                  }}>{emptyText}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} hover>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} sx={{ verticalAlign: "top" }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
