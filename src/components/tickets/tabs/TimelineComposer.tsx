"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { createClient } from "@/lib/supabase/client";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/context";

const BUCKET = "ticket-files";

export default function TimelineComposer({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const T = useT();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function currentUserId(): Promise<string | null> {
    const { data } = await authClient.getSession();
    return data?.user.id ?? null;
  }

  async function postComment() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const uid = await currentUserId();
    const { error } = await supabase.from("ticket_events").insert({
      ticket_id: ticketId,
      actor_id: uid,
      kind: "comment",
      summary: body,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setText("");
    router.refresh();
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    const uid = await currentUserId();
    try {
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${ticketId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || undefined,
        });
        if (up.error) throw up.error;
        const ins = await supabase.from("ticket_events").insert({
          ticket_id: ticketId,
          actor_id: uid,
          kind: "attachment",
          summary: file.name,
          meta: { path, name: file.name, size: file.size, mime: file.type },
        });
        if (ins.error) throw ins.error;
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T.ticket.timeline.uploadError);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder={T.ticket.timeline.addComment}
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment();
          }}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          variant="outlined"
          sx={{ minWidth: 0, px: 1.5, height: 40 }}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          title={T.ticket.timeline.attachFile}
        >
          <AttachFileIcon fontSize="small" />
        </Button>
        <Button
          variant="contained"
          disableElevation
          sx={{ minWidth: 0, px: 1.5, height: 40 }}
          disabled={busy || !text.trim()}
          onClick={postComment}
          title={T.ticket.timeline.send}
        >
          {busy ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
