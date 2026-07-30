"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { authClient } from "@/lib/auth-client";
import { useT, useLocale } from "@/lib/i18n/context";
import { INTL_LOCALE } from "@/lib/i18n";

type Passkey = {
  id: string;
  name?: string | null;
  createdAt: Date | string;
};

export default function PasskeyManager() {
  const T = useT();
  const locale = useLocale();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");

  const reload = useCallback(async () => {
    const { data, error: err } = await authClient.passkey.listUserPasskeys();
    if (!err) setPasskeys((data ?? []) as Passkey[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    authClient.passkey.listUserPasskeys().then(({ data, error: err }) => {
      if (!active) return;
      if (!err) setPasskeys((data ?? []) as Passkey[]);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.passkey.addPasskey({
        name: name.trim() || undefined,
      });
      if (result?.error) {
        setError(result.error.message ?? T.profile.passkeys.error);
        return;
      }
      setAddOpen(false);
      setName("");
      setSnack(T.profile.passkeys.added);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function deletePasskey(id: string) {
    if (!window.confirm(T.profile.passkeys.deleteConfirm)) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await authClient.passkey.deletePasskey({ id });
      if (err) {
        setError(err.message ?? T.profile.passkeys.error);
        return;
      }
      setSnack(T.profile.passkeys.deleted);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
        {T.profile.passkeys.heading}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {T.profile.passkeys.description}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={24} />
      ) : passkeys.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {T.profile.passkeys.empty}
        </Typography>
      ) : (
        <List dense sx={{ mb: 1 }}>
          {passkeys.map((pk) => (
            <ListItem
              key={pk.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  disabled={busy}
                  onClick={() => deletePasskey(pk.id)}
                  title={T.profile.passkeys.delete}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <KeyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={pk.name || "Passkey"}
                secondary={
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${T.profile.passkeys.createdAt}: ${new Date(
                      pk.createdAt,
                    ).toLocaleDateString(INTL_LOCALE[locale])}`}
                  />
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        disabled={busy}
        onClick={() => setAddOpen(true)}
      >
        {T.profile.passkeys.add}
      </Button>

      <Dialog open={addOpen} onClose={() => !busy && setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{T.profile.passkeys.add}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={T.profile.passkeys.name}
            placeholder={T.profile.passkeys.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={busy}>
            {T.common.cancel}
          </Button>
          <Button variant="contained" onClick={addPasskey} disabled={busy}>
            {busy ? <CircularProgress size={20} color="inherit" /> : T.common.add}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack !== null}
        autoHideDuration={2500}
        onClose={() => setSnack(null)}
        message={snack ?? ""}
      />
    </Box>
  );
}
