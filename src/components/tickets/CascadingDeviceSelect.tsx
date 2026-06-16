"use client";
import { useEffect, useState } from "react";
import { Autocomplete, TextField, Stack } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import type { Group, Brand, Model, Modification } from "@/lib/types";

type DbClient = ReturnType<typeof createClient>;

// Selection carries both the chosen id (when picked from the catalog) and the
// raw name (so a manually-typed, not-yet-existing value can be created on save).
export interface DeviceSelection {
  group_id: number | null;
  group_name: string;
  brand_id: number | null;
  brand_name: string;
  model_id: number | null;
  model_name: string;
  modification_id: number | null;
  modification_name: string;
}

export const emptyDeviceSelection: DeviceSelection = {
  group_id: null,
  group_name: "",
  brand_id: null,
  brand_name: "",
  model_id: null,
  model_name: "",
  modification_id: null,
  modification_name: "",
};

interface Named {
  id: number;
  name: string;
}

// Find or create a catalog row by name under an optional parent column. Returns
// the resolved id (null only if name is blank).
async function resolveLevel(
  supabase: DbClient,
  table: string,
  name: string,
  parent?: { col: string; id: number },
): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  let q = supabase.from(table).select("id").ilike("name", trimmed);
  if (parent) q = q.eq(parent.col, parent.id);
  const { data: existing } = await q.limit(1).maybeSingle();
  if (existing) return existing.id as number;

  const row: Record<string, unknown> = { name: trimmed };
  if (parent) row[parent.col] = parent.id;
  const { data: created } = await supabase
    .from(table)
    .insert(row)
    .select("id")
    .single();
  return created ? (created.id as number) : null;
}

// Resolve a selection to concrete catalog ids, creating any missing
// group/brand/model/modification rows top-down. Returns nulls for blank levels.
export async function resolveDeviceSelection(
  supabase: DbClient,
  sel: DeviceSelection,
): Promise<Pick<DeviceSelection, "group_id" | "brand_id" | "model_id" | "modification_id">> {
  const group_id = sel.group_id ?? (await resolveLevel(supabase, "groups", sel.group_name));
  const brand_id =
    sel.brand_id ??
    (group_id
      ? await resolveLevel(supabase, "brands", sel.brand_name, { col: "group_id", id: group_id })
      : null);
  const model_id =
    sel.model_id ??
    (brand_id
      ? await resolveLevel(supabase, "models", sel.model_name, { col: "brand_id", id: brand_id })
      : null);
  const modification_id =
    sel.modification_id ??
    (model_id
      ? await resolveLevel(supabase, "modifications", sel.modification_name, {
          col: "model_id",
          id: model_id,
        })
      : null);
  return { group_id, brand_id, model_id, modification_id };
}

const FILL = "Заповніть це поле";

export default function CascadingDeviceSelect({
  value,
  onChange,
  showErrors,
  disabled = false,
}: {
  value: DeviceSelection;
  onChange: (v: DeviceSelection) => void;
  showErrors?: boolean;
  disabled?: boolean;
}) {
  const supabase = createClient();
  const [groups, setGroups] = useState<Group[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [mods, setMods] = useState<Modification[]>([]);

  // load groups once
  useEffect(() => {
    supabase
      .from("groups")
      .select("*")
      .order("name")
      .then(({ data }) => setGroups(data ?? []));
  }, [supabase]);

  // load child lists when the parent id changes (also covers external autofill)
  useEffect(() => {
    let active = true;
    if (!value.group_id) {
      setBrands([]);
      return;
    }
    supabase
      .from("brands")
      .select("*")
      .eq("group_id", value.group_id)
      .order("name")
      .then(({ data }) => active && setBrands(data ?? []));
    return () => {
      active = false;
    };
  }, [supabase, value.group_id]);

  useEffect(() => {
    let active = true;
    if (!value.brand_id) {
      setModels([]);
      return;
    }
    supabase
      .from("models")
      .select("*")
      .eq("brand_id", value.brand_id)
      .order("name")
      .then(({ data }) => active && setModels(data ?? []));
    return () => {
      active = false;
    };
  }, [supabase, value.brand_id]);

  useEffect(() => {
    let active = true;
    if (!value.model_id) {
      setMods([]);
      return;
    }
    supabase
      .from("modifications")
      .select("*")
      .eq("model_id", value.model_id)
      .order("name")
      .then(({ data }) => active && setMods(data ?? []));
    return () => {
      active = false;
    };
  }, [supabase, value.model_id]);

  // Generic free-solo level. Selecting an option sets the id; typing a new name
  // sets the name with id=null. Any change resets all descendant levels.
  function level(
    label: string,
    options: Named[],
    idKey: "group_id" | "brand_id" | "model_id" | "modification_id",
    nameKey: "group_name" | "brand_name" | "model_name" | "modification_name",
    reset: Partial<DeviceSelection>,
    disabled: boolean,
    requiredLevel: boolean,
  ) {
    function commit(name: string) {
      const match = options.find((o) => o.name.toLowerCase() === name.trim().toLowerCase());
      onChange({ ...value, ...reset, [idKey]: match?.id ?? null, [nameKey]: name });
    }
    const err = !!requiredLevel && !!showErrors && !value[nameKey].trim();
    return (
      <Autocomplete
        freeSolo
        disabled={disabled}
        options={options}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
        isOptionEqualToValue={(o, v) => o.id === (v as Named).id}
        inputValue={value[nameKey]}
        onInputChange={(_, text, reason) => {
          if (reason === "reset") return; // selection handled by onChange
          commit(text);
        }}
        onChange={(_, o) => {
          if (o && typeof o !== "string") {
            onChange({ ...value, ...reset, [idKey]: o.id, [nameKey]: o.name });
          } else {
            commit(typeof o === "string" ? o : "");
          }
        }}
        renderInput={(p) => (
          <TextField
            {...p}
            label={label}
            required={requiredLevel}
            error={err}
            helperText={err ? FILL : undefined}
          />
        )}
      />
    );
  }

  return (
    <Stack spacing={2}>
      {level("Група", groups, "group_id", "group_name", {
        brand_id: null,
        brand_name: "",
        model_id: null,
        model_name: "",
        modification_id: null,
        modification_name: "",
      }, disabled, true)}
      {level("Бренд", brands, "brand_id", "brand_name", {
        model_id: null,
        model_name: "",
        modification_id: null,
        modification_name: "",
      }, disabled || !value.group_name, true)}
      {level("Модель", models, "model_id", "model_name", {
        modification_id: null,
        modification_name: "",
      }, disabled || !value.brand_name, true)}
      {level("Модифікація", mods, "modification_id", "modification_name", {}, disabled || !value.model_name, false)}
    </Stack>
  );
}
