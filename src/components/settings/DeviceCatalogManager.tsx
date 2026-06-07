"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import type { Group } from "@/lib/types";

interface Row {
  id: number;
  name: string;
}

function CatalogColumn({
  title,
  rows,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  disabled = false,
  placeholder,
}: {
  title: string;
  rows: Row[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (row: Row) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const name = adding.trim();
    if (!name) return;
    setBusy(true);
    await onAdd(name);
    setBusy(false);
    setAdding("");
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ px: 1.5, py: 1, fontWeight: 700, borderBottom: "1px solid #e0e0e0" }}
      >
        {title}
      </Typography>
      <List dense sx={{ flex: 1, overflowY: "auto", maxHeight: 360, py: 0 }}>
        {rows.length === 0 ? (
          <Typography
            variant="caption"
            sx={{ display: "block", px: 1.5, py: 2, color: "text.secondary" }}
          >
            {disabled ? placeholder : "—"}
          </Typography>
        ) : (
          rows.map((row) => (
            <ListItemButton
              key={row.id}
              selected={row.id === selectedId}
              onClick={() => onSelect(row.id)}
              sx={{ pr: 0.5 }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.name}
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = window.prompt(T.settings.catalog.newName, row.name);
                  if (next && next.trim() && next.trim() !== row.name) {
                    onRename(row.id, next.trim());
                  }
                }}
              >
                <EditIcon fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      T.settings.catalog.deleteConfirm.replace("{name}", row.name),
                    )
                  ) {
                    onDelete(row);
                  }
                }}
              >
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </ListItemButton>
          ))
        )}
      </List>
      {!disabled && (
        <Stack direction="row" spacing={1} sx={{ p: 1, borderTop: "1px solid #e0e0e0" }}>
          <TextField
            size="small"
            fullWidth
            placeholder={T.settings.catalog.newName}
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <Button
            size="small"
            variant="contained"
            disabled={busy || !adding.trim()}
            onClick={add}
            sx={{ minWidth: 0, px: 1 }}
          >
            <AddIcon fontSize="small" />
          </Button>
        </Stack>
      )}
    </Box>
  );
}

export default function DeviceCatalogManager({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [groupId, setGroupId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);

  const [brands, setBrands] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>([]);
  const [mods, setMods] = useState<Row[]>([]);

  useEffect(() => {
    let active = true;
    if (!groupId) {
      setBrands([]);
      return;
    }
    supabase
      .from("brands")
      .select("id,name")
      .eq("group_id", groupId)
      .order("name")
      .then(({ data }) => active && setBrands(data ?? []));
    return () => {
      active = false;
    };
  }, [supabase, groupId]);

  useEffect(() => {
    let active = true;
    if (!brandId) {
      setModels([]);
      return;
    }
    supabase
      .from("models")
      .select("id,name")
      .eq("brand_id", brandId)
      .order("name")
      .then(({ data }) => active && setModels(data ?? []));
    return () => {
      active = false;
    };
  }, [supabase, brandId]);

  useEffect(() => {
    let active = true;
    if (!modelId) {
      setMods([]);
      return;
    }
    supabase
      .from("modifications")
      .select("id,name")
      .eq("model_id", modelId)
      .order("name")
      .then(({ data }) => active && setMods(data ?? []));
    return () => {
      active = false;
    };
  }, [supabase, modelId]);

  async function reloadBrands(gid: number) {
    const { data } = await supabase
      .from("brands")
      .select("id,name")
      .eq("group_id", gid)
      .order("name");
    setBrands(data ?? []);
  }
  async function reloadModels(bid: number) {
    const { data } = await supabase
      .from("models")
      .select("id,name")
      .eq("brand_id", bid)
      .order("name");
    setModels(data ?? []);
  }
  async function reloadMods(mid: number) {
    const { data } = await supabase
      .from("modifications")
      .select("id,name")
      .eq("model_id", mid)
      .order("name");
    setMods(data ?? []);
  }

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      sx={{ alignItems: "stretch" }}
    >
      <CatalogColumn
        title={T.settings.catalog.groups}
        rows={groups}
        selectedId={groupId}
        onSelect={(id) => {
          setGroupId(id);
          setBrandId(null);
          setModelId(null);
        }}
        onAdd={async (name) => {
          await supabase.from("groups").insert({ name });
          router.refresh();
        }}
        onRename={async (id, name) => {
          await supabase.from("groups").update({ name }).eq("id", id);
          router.refresh();
        }}
        onDelete={async (row) => {
          await supabase.from("groups").delete().eq("id", row.id);
          if (groupId === row.id) {
            setGroupId(null);
            setBrandId(null);
            setModelId(null);
          }
          router.refresh();
        }}
      />
      <CatalogColumn
        title={T.settings.catalog.brands}
        rows={brands}
        selectedId={brandId}
        disabled={!groupId}
        placeholder={T.settings.catalog.pickGroup}
        onSelect={(id) => {
          setBrandId(id);
          setModelId(null);
        }}
        onAdd={async (name) => {
          await supabase.from("brands").insert({ group_id: groupId, name });
          if (groupId) reloadBrands(groupId);
        }}
        onRename={async (id, name) => {
          await supabase.from("brands").update({ name }).eq("id", id);
          if (groupId) reloadBrands(groupId);
        }}
        onDelete={async (row) => {
          await supabase.from("brands").delete().eq("id", row.id);
          if (brandId === row.id) {
            setBrandId(null);
            setModelId(null);
          }
          if (groupId) reloadBrands(groupId);
        }}
      />
      <CatalogColumn
        title={T.settings.catalog.models}
        rows={models}
        selectedId={modelId}
        disabled={!brandId}
        placeholder={T.settings.catalog.pickBrand}
        onSelect={(id) => setModelId(id)}
        onAdd={async (name) => {
          await supabase.from("models").insert({ brand_id: brandId, name });
          if (brandId) reloadModels(brandId);
        }}
        onRename={async (id, name) => {
          await supabase.from("models").update({ name }).eq("id", id);
          if (brandId) reloadModels(brandId);
        }}
        onDelete={async (row) => {
          await supabase.from("models").delete().eq("id", row.id);
          if (modelId === row.id) setModelId(null);
          if (brandId) reloadModels(brandId);
        }}
      />
      <CatalogColumn
        title={T.settings.catalog.modifications}
        rows={mods}
        selectedId={null}
        disabled={!modelId}
        placeholder={T.settings.catalog.pickModel}
        onSelect={() => {}}
        onAdd={async (name) => {
          await supabase.from("modifications").insert({ model_id: modelId, name });
          if (modelId) reloadMods(modelId);
        }}
        onRename={async (id, name) => {
          await supabase.from("modifications").update({ name }).eq("id", id);
          if (modelId) reloadMods(modelId);
        }}
        onDelete={async (row) => {
          await supabase.from("modifications").delete().eq("id", row.id);
          if (modelId) reloadMods(modelId);
        }}
      />
    </Stack>
  );
}
