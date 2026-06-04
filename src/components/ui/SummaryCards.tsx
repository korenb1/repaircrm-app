"use client";
import { Box, Paper, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PaidIcon from "@mui/icons-material/Paid";
import { T } from "@/lib/constants";
import { formatUAH } from "@/lib/money";

function Card({
  icon,
  value,
  label,
  bg,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  bg: string;
}) {
  return (
    <Paper
      sx={{
        flex: 1,
        p: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        bgcolor: bg,
        color: "#fff",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>{icon}</Box>
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            lineHeight: 1.1
          }}>
          {value}
        </Typography>
        <Typography variant="caption">{label}</Typography>
      </Box>
    </Paper>
  );
}

export default function SummaryCards({
  mine,
  overdue,
  receivable,
}: {
  mine: number;
  overdue: number;
  receivable: number;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
      <Card
        icon={<PersonIcon />}
        value={String(mine)}
        label={T.workflows.cards.mine}
        bg="#43a047"
      />
      <Card
        icon={<AccessTimeIcon />}
        value={String(overdue)}
        label={T.workflows.cards.overdue}
        bg="#fb8c00"
      />
      <Card
        icon={<PaidIcon />}
        value={formatUAH(receivable)}
        label={T.workflows.cards.receivable}
        bg="#37474f"
      />
    </Box>
  );
}
