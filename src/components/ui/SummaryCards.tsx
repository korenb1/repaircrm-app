"use client";
import { Box, Paper, Typography, alpha } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PaidIcon from "@mui/icons-material/Paid";
import { useT, useMoney } from "@/lib/i18n/context";

function Card({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: 200,
        px: 2.5,
        py: 2,
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(38,43,67,0.16)",
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(accent, 0.14),
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, lineHeight: 1.1, color: "text.primary" }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
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
  const T = useT();
  const money = useMoney();
  return (
    <Box sx={{ display: "flex", gap: 1.5, mb: 2, justifyContent: "flex-end" }}>
      <Card
        icon={<PersonIcon />}
        value={String(mine)}
        label={T.workflows.cards.mine}
        accent="#43a047"
      />
      <Card
        icon={<AccessTimeIcon />}
        value={String(overdue)}
        label={T.workflows.cards.overdue}
        accent="#fb8c00"
      />
      <Card
        icon={<PaidIcon />}
        value={money(receivable)}
        label={T.workflows.cards.receivable}
        accent="#37474f"
      />
    </Box>
  );
}
