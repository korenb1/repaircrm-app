"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { createClient } from "@/lib/supabase/client";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/context";
import ImageLightbox, { type LightboxImage } from "@/components/ui/ImageLightbox";
import type { ContactDocument } from "@/lib/types";

const BUCKET = "contact-files";
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i;

function isImage(doc: ContactDocument) {
  if (doc.mime) return doc.mime.startsWith("image/");
  return IMAGE_EXT.test(doc.name ?? "");
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}


export default function DocumentsTab({
  contactId,
  documents,
}: {
  contactId: number;
  documents: ContactDocument[];
}) {
  const router = useRouter();
  const T = useT();
  const supabase = createClient();

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    const units = [T.common.unitB, T.common.unitKB, T.common.unitMB, T.common.unitGB];
    let n = bytes;
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { images, imageIndexByDoc } = useMemo(() => {
    const imgs: LightboxImage[] = [];
    const byDoc = new Map<number, number>();
    for (const d of documents) {
      if (!isImage(d)) continue;
      byDoc.set(d.id, imgs.length);
      imgs.push({ url: publicUrl(d.path), name: d.name ?? d.path });
    }
    return { images: imgs, imageIndexByDoc: byDoc };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    const { data: session } = await authClient.getSession();
    const uid = session?.user.id ?? null;
    try {
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${contactId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || undefined,
        });
        if (up.error) throw up.error;
        const ins = await supabase.from("contact_documents").insert({
          contact_id: contactId,
          path,
          name: file.name,
          size: file.size,
          mime: file.type,
          uploaded_by: uid,
        });
        if (ins.error) throw ins.error;
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T.contactCard.documents.uploadError);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(doc: ContactDocument) {
    setBusy(true);
    setError(null);
    try {
      await supabase.storage.from(BUCKET).remove([doc.path]);
      const del = await supabase.from("contact_documents").delete().eq("id", doc.id);
      if (del.error) throw del.error;
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T.contactCard.documents.deleteError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, alignItems: "center" }} spacing={2}>
        <Button
          variant="contained"
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {T.contactCard.documents.upload}
        </Button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {T.contactCard.documents.noDocuments}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {documents.map((d) => {
            const imgIdx = imageIndexByDoc.get(d.id);
            const isImg = imgIdx !== undefined;
            return (
              <Stack
                key={d.id}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                  border: "1px solid #eee",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                {isImg ? (
                  <Box
                    component="img"
                    src={images[imgIdx!].url}
                    alt={d.name ?? d.path}
                    onClick={() => setLightbox(imgIdx!)}
                    sx={{
                      width: 56,
                      height: 56,
                      objectFit: "cover",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 1,
                      bgcolor: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <UploadFileIcon sx={{ color: "#90a4ae" }} />
                  </Box>
                )}
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <MuiLink
                    href={publicUrl(d.path)}
                    target="_blank"
                    rel="noopener"
                    underline="hover"
                    sx={{ fontWeight: 600, wordBreak: "break-word" }}
                  >
                    {d.name ?? d.path}
                  </MuiLink>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {fmtDate(d.created_at)}
                    {d.size ? ` · ${formatSize(d.size)}` : ""}
                  </Typography>
                </Box>
                <IconButton size="small" disabled={busy} onClick={() => remove(d)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
      )}

      <ImageLightbox
        images={images}
        index={lightbox}
        onIndexChange={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </Box>
  );
}
