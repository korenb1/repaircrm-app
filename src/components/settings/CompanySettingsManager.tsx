"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type { CompanySettings } from "@/lib/types";

const BUCKET = "company-files";

export default function CompanySettingsManager({
  company,
}: {
  company: CompanySettings;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(company.name);
  const [address, setAddress] = useState(company.address);
  const [phone, setPhone] = useState(company.phone);
  const [email, setEmail] = useState(company.email);
  const [info, setInfo] = useState(company.additional_info);
  const [logoPath, setLogoPath] = useState<string | null>(company.logo_path);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const logoUrl = logoPath
    ? supabase.storage.from(BUCKET).getPublicUrl(logoPath).data.publicUrl
    : null;

  async function onLogo(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    const file = files[0];
    setBusy(true);
    setError(null);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `logo/${Date.now()}-${safe}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: true,
      });
      if (up.error) throw up.error;
      // Drop the previous logo so the bucket does not accumulate orphans.
      if (logoPath) await supabase.storage.from(BUCKET).remove([logoPath]);
      setLogoPath(path);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!logoPath || busy) return;
    setBusy(true);
    setError(null);
    try {
      await supabase.storage.from(BUCKET).remove([logoPath]);
      setLogoPath(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка видалення");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("company_settings")
        .update({
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          additional_info: info.trim(),
          logo_path: logoPath,
        })
        .eq("id", 1);
      if (err) throw err;
      setSaved(true);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setBusy(false);
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
        <TextField
          label={T.settings.company.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />
        <TextField
          label={T.settings.company.address}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={T.settings.company.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />
          <TextField
            label={T.settings.company.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
        </Stack>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            {T.settings.company.logo}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 120,
                height: 80,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#fafafa",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {logoUrl ? (
                <Box
                  component="img"
                  src={logoUrl}
                  alt=""
                  sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              ) : (
                <UploadFileIcon sx={{ color: "#b0bec5" }} />
              )}
            </Box>
            <Button
              variant="outlined"
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {T.settings.company.uploadLogo}
            </Button>
            {logoPath && (
              <IconButton disabled={busy} onClick={removeLogo} title={T.settings.company.removeLogo}>
                <DeleteOutlineIcon />
              </IconButton>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onLogo(e.target.files)}
            />
          </Stack>
        </Box>

        <TextField
          label={T.settings.company.additionalInfo}
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          fullWidth
          multiline
          minRows={4}
        />

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

      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
        message={T.settings.company.saved}
      />
    </Box>
  );
}
