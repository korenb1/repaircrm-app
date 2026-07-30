"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Typography,
  alpha,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { createClient } from "@/lib/supabase/client";
import { useT, useMoney } from "@/lib/i18n/context";
import type { FinanceAccountType, FinancialAccount } from "@/lib/types";

const ACCENT: Record<FinanceAccountType, string> = {
  cash: "#43a047",
  cashless: "#5c6bc0",
  card: "#6366f1",
};

function typeIcon(type: FinanceAccountType) {
  if (type === "cash") return <PaymentsIcon />;
  if (type === "cashless") return <AccountBalanceIcon />;
  return <CreditCardIcon />;
}

export default function AccountCard({
  account,
  balance,
  selected,
  onClick,
  onEdit,
}: {
  account: FinancialAccount;
  balance: number;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const T = useT();
  const money = useMoney();
  const accent = ACCENT[account.type];
  const masked =
    account.type === "card" && account.card_last4
      ? `**** **** **** ${account.card_last4}`
      : null;

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notEmptyOpen, setNotEmptyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const empty = balance === 0;

  function openMenu(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuAnchor(null);
    onEdit();
  }

  // Deleting only removes the account card; its past transactions are kept
  // (FK is ON DELETE SET NULL). Allowed only when the balance is zero.
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuAnchor(null);
    if (empty) setConfirmOpen(true);
    else setNotEmptyOpen(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    await supabase.from("financial_accounts").delete().eq("id", account.id);
    setDeleting(false);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        position: "relative",
        px: 2.5,
        py: 2,
        borderRadius: "12px",
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(38,43,67,0.16)",
        border: "2px solid",
        borderColor: selected ? accent : "transparent",
        transition: "border-color 120ms, transform 120ms",
        "&:hover": { transform: "translateY(-1px)" },
        "&:hover .card-menu-btn": { opacity: 1 },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(accent, 0.14),
          color: accent,
        }}
      >
        {typeIcon(account.type)}
      </Box>

      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, color: "text.primary", pr: 6, lineHeight: 1.2 }}
      >
        {account.name}
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: "text.secondary", letterSpacing: 1, minHeight: 20, mt: 0.5 }}
      >
        {masked ?? T.finances.types[account.type]}
      </Typography>

      <Typography
        variant="h5"
        sx={{ fontWeight: 800, color: "text.primary", mt: 2.5 }}
      >
        {money(balance)}
      </Typography>

      <IconButton
        className="card-menu-btn"
        size="small"
        onClick={openMenu}
        sx={{
          position: "absolute",
          bottom: 8,
          right: 8,
          opacity: menuAnchor ? 1 : 0,
          transition: "opacity 120ms",
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={(e) => {
          (e as React.MouseEvent)?.stopPropagation?.();
          setMenuAnchor(null);
        }}
      >
        <MenuItem onClick={handleEdit} sx={{ justifyContent: "center" }}>
          <EditIcon fontSize="small" />
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{ justifyContent: "center", color: "error.main" }}
        >
          <DeleteIcon fontSize="small" color="error" />
        </MenuItem>
      </Menu>

      <Dialog
        open={confirmOpen}
        onClose={(e) => {
          (e as React.MouseEvent)?.stopPropagation?.();
          setConfirmOpen(false);
        }}
        onClick={(e) => e.stopPropagation()}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{T.finances.account.deleteTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {T.finances.account.deleteConfirm}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{T.common.cancel}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {T.common.delete}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={notEmptyOpen}
        onClose={(e) => {
          (e as React.MouseEvent)?.stopPropagation?.();
          setNotEmptyOpen(false);
        }}
        onClick={(e) => e.stopPropagation()}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{T.finances.account.deleteTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {T.finances.account.deleteNotEmpty}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotEmptyOpen(false)}>{T.common.cancel}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
