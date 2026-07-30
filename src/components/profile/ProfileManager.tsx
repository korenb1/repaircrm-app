"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LockResetIcon from "@mui/icons-material/LockReset";
import { createClient } from "@/lib/supabase/client";
import { authClient } from "@/lib/auth-client";
import PasskeyManager from "@/components/profile/PasskeyManager";
import { useT } from "@/lib/i18n/context";
import { LOCALES } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/i18n/currencies";
import type { Profile } from "@/lib/types";

const BUCKET = "avatars";

export default function ProfileManager({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const T = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone);
  const [telegram, setTelegram] = useState(profile.telegram_username);
  const [language, setLanguage] = useState(profile.language || "en");
  const [currency, setCurrency] = useState(profile.currency || "USD");
  const [avatarPath, setAvatarPath] = useState<string | null>(
    profile.avatar_path,
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Password section
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwChanged, setPwChanged] = useState(false);

  const avatarUrl = avatarPath
    ? supabase.storage.from(BUCKET).getPublicUrl(avatarPath).data.publicUrl
    : null;

  async function onPhoto(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    const file = files[0];
    setBusy(true);
    setError(null);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `avatar/${profile.id}-${Date.now()}-${safe}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: true,
      });
      if (up.error) throw up.error;
      // Drop the previous avatar so the bucket does not accumulate orphans.
      if (avatarPath) await supabase.storage.from(BUCKET).remove([avatarPath]);
      setAvatarPath(path);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T.common.uploadError);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!avatarPath || busy) return;
    setBusy(true);
    setError(null);
    try {
      await supabase.storage.from(BUCKET).remove([avatarPath]);
      setAvatarPath(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T.common.deleteError);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          telegram_username: telegram.trim().replace(/^@+/, ""),
          language,
          currency,
          avatar_path: avatarPath,
        })
        .eq("id", profile.id);
      if (err) throw err;
      setSaved(true);
      // Refresh so the app layout re-seeds I18nProvider with the new
      // language/currency and the whole UI updates.
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T.common.saveError);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setPwError(null);
    if (newPw.length < 6) {
      setPwError(T.profile.password.tooShort);
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(T.profile.password.mismatch);
      return;
    }
    setPwBusy(true);
    try {
      // Better Auth verifies the current password server-side.
      const { error: pwErr } = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: true,
      });
      if (pwErr) {
        setPwError(
          pwErr.status === 400 || pwErr.status === 401
            ? T.profile.password.wrong
            : (pwErr.message ?? T.profile.password.error),
        );
        return;
      }
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwChanged(true);
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : T.profile.password.error);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            {T.profile.photo}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Avatar
              src={avatarUrl ?? undefined}
              sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: 32 }}
            >
              {fullName.charAt(0).toUpperCase()}
            </Avatar>
            <Button
              variant="outlined"
              startIcon={
                busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <UploadFileIcon />
                )
              }
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {T.profile.uploadPhoto}
            </Button>
            {avatarPath && (
              <IconButton
                disabled={busy}
                onClick={removePhoto}
                title={T.profile.removePhoto}
              >
                <DeleteOutlineIcon />
              </IconButton>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPhoto(e.target.files)}
            />
          </Stack>
        </Box>

        <TextField label={T.profile.email} value={email} fullWidth disabled />
        <TextField
          label={T.profile.fullName}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          fullWidth
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={T.profile.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />
          <TextField
            label={T.profile.telegram}
            value={telegram.replace(/^@+/, "")}
            onChange={(e) => setTelegram(e.target.value.replace(/^@+/, ""))}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">@</InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
          {T.profile.preferences}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label={T.profile.language}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            fullWidth
          >
            {LOCALES.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={T.profile.currency}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            fullWidth
          >
            {CURRENCIES.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.code} — {c.label} ({c.symbol})
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={save}
            disabled={busy}
          >
            {T.common.save}
          </Button>
        </Box>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <PasskeyManager />

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {T.profile.password.heading}
      </Typography>
      {pwError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPwError(null)}>
          {pwError}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField
          label={T.profile.password.current}
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          fullWidth
          autoComplete="current-password"
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={T.profile.password.new}
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />
          <TextField
            label={T.profile.password.confirm}
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />
        </Stack>
        <Box>
          <Button
            variant="outlined"
            startIcon={
              pwBusy ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <LockResetIcon />
              )
            }
            onClick={changePassword}
            disabled={pwBusy || !currentPw || !newPw || !confirmPw}
          >
            {T.profile.password.change}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message={T.profile.saved}
      />
      <Snackbar
        open={pwChanged}
        autoHideDuration={2500}
        onClose={() => setPwChanged(false)}
        message={T.profile.password.changed}
      />
    </Box>
  );
}
