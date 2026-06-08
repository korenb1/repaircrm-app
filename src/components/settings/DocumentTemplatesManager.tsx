"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { Editor as TinyMCEEditor } from "tinymce";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import { VARIABLE_GROUPS } from "@/lib/document-variables";
import type { DocumentTemplate, DocumentTemplateKind } from "@/lib/types";

const Editor = dynamic(
  () => import("@tinymce/tinymce-react").then((m) => m.Editor),
  { ssr: false },
);

const KIND_OPTIONS: DocumentTemplateKind[] = [
  "acceptance_receipt",
  "completion_act",
  "invoice",
  "other",
];

const EDITOR_INIT = {
  height: 640,
  menubar: false,
  plugins:
    "advlist autolink lists link image charmap preview anchor searchreplace " +
    "visualblocks code fullscreen insertdatetime media table pagebreak",
  toolbar:
    "undo redo | fontfamily fontsize forecolor | " +
    "bold italic underline strikethrough | alignleft aligncenter " +
    "alignright alignjustify outdent indent | table image bullist numlist | " +
    "pagebreak | removeformat | code",
  branding: false,
  content_style:
    "body { font-family: sans-serif, Helvetica, Arial; font-size: 12px; } p { margin: 0; }",
};

function VariablesSidebar({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  return (
    <Box sx={{ width: 280, flexShrink: 0, borderLeft: "1px solid #e0e0e0" }}>
      <Box sx={{ p: 1.5, borderBottom: "1px solid #e0e0e0" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {T.documents.variables}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {T.documents.variablesHint}
        </Typography>
      </Box>
      <Box sx={{ maxHeight: 600, overflowY: "auto" }}>
        {VARIABLE_GROUPS.map((group, i) => (
          <Accordion
            key={group.key}
            disableGutters
            elevation={0}
            defaultExpanded={i === 0}
            sx={{ "&:before": { display: "none" }, borderBottom: "1px solid #eee" }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {group.label}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={0.5}>
                {group.variables.map((v) => (
                  <Box
                    key={v.token}
                    onClick={() => onInsert(v.token)}
                    sx={{
                      cursor: "pointer",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "primary.main", fontFamily: "monospace" }}
                    >
                      {`{{${v.token}}}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {v.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}

export default function DocumentTemplatesManager({
  templates,
}: {
  templates: DocumentTemplate[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const editorRef = useRef<TinyMCEEditor | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(
    templates[0]?.id ?? null,
  );
  const [name, setName] = useState(templates[0]?.name ?? "");
  const [kind, setKind] = useState<DocumentTemplateKind>(
    templates[0]?.kind ?? "other",
  );
  const [saving, setSaving] = useState(false);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function selectTemplate(t: DocumentTemplate) {
    setSelectedId(t.id);
    setName(t.name);
    setKind(t.kind);
  }

  async function createTemplate() {
    const { data, error } = await supabase
      .from("document_templates")
      .insert({ name: T.documents.untitled, kind: "other", content: "" })
      .select()
      .single();
    if (error || !data) return;
    setSelectedId(data.id);
    setName(data.name);
    setKind(data.kind);
    router.refresh();
  }

  async function save() {
    if (selectedId == null) return;
    setSaving(true);
    const content = editorRef.current?.getContent() ?? selected?.content ?? "";
    await supabase
      .from("document_templates")
      .update({ name: name.trim() || T.documents.untitled, kind, content })
      .eq("id", selectedId);
    setSaving(false);
    router.refresh();
  }

  async function remove(t: DocumentTemplate) {
    if (!window.confirm(T.documents.deleteConfirm.replace("{name}", t.name)))
      return;
    await supabase.from("document_templates").delete().eq("id", t.id);
    if (selectedId === t.id) {
      const next = templates.find((x) => x.id !== t.id) ?? null;
      if (next) selectTemplate(next);
      else setSelectedId(null);
    }
    router.refresh();
  }

  function insertToken(token: string) {
    editorRef.current?.insertContent(`{{${token}}}`);
  }

  return (
    <Box sx={{ display: "flex", border: "1px solid #e0e0e0", borderRadius: 1, minHeight: 640 }}>
      {/* Template list */}
      <Box sx={{ width: 240, flexShrink: 0, borderRight: "1px solid #e0e0e0" }}>
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createTemplate}
          >
            {T.documents.newTemplate}
          </Button>
        </Box>
        <Divider />
        <List dense sx={{ py: 0 }}>
          {templates.map((t) => (
            <ListItemButton
              key={t.id}
              selected={t.id === selectedId}
              onClick={() => selectTemplate(t)}
            >
              <ListItemText
                primary={t.name}
                secondary={
                  <Chip
                    label={T.documents.kinds[t.kind]}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: 10 }}
                  />
                }
                slotProps={{
                  primary: { noWrap: true },
                  secondary: { component: "div" },
                }}
              />
              <Tooltip title="">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Editor pane */}
      {selected ? (
        <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ p: 1.5, alignItems: "center", borderBottom: "1px solid #e0e0e0" }}
          >
            <TextField
              size="small"
              label={T.documents.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              size="small"
              select
              label={T.documents.kind}
              value={kind}
              onChange={(e) => setKind(e.target.value as DocumentTemplateKind)}
              sx={{ width: 200 }}
            >
              {KIND_OPTIONS.map((k) => (
                <MenuItem key={k} value={k}>
                  {T.documents.kinds[k]}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={save}
              disabled={saving}
            >
              {T.common.save}
            </Button>
          </Stack>
          <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Editor
                key={selected.id}
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                onInit={(_evt, editor) => {
                  editorRef.current = editor;
                }}
                initialValue={selected.content}
                init={EDITOR_INIT}
              />
            </Box>
            <VariablesSidebar onInsert={insertToken} />
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">{T.documents.empty}</Typography>
        </Box>
      )}
    </Box>
  );
}
