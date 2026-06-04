"use client";
import { useEffect, useState } from "react";
import { Autocomplete, TextField, Stack } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import type { Group, Brand, Model, Modification } from "@/lib/types";

export interface DeviceSelection {
  group_id: number | null;
  brand_id: number | null;
  model_id: number | null;
  modification_id: number | null;
}

export default function CascadingDeviceSelect({
  value,
  onChange,
}: {
  value: DeviceSelection;
  onChange: (v: DeviceSelection) => void;
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

  // load brands when group changes
  useEffect(() => {
    let active = true;
    async function load() {
      if (!value.group_id) {
        if (active) setBrands([]);
        return;
      }
      const { data } = await supabase
        .from("brands")
        .select("*")
        .eq("group_id", value.group_id)
        .order("name");
      if (active) setBrands(data ?? []);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, value.group_id]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!value.brand_id) {
        if (active) setModels([]);
        return;
      }
      const { data } = await supabase
        .from("models")
        .select("*")
        .eq("brand_id", value.brand_id)
        .order("name");
      if (active) setModels(data ?? []);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, value.brand_id]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!value.model_id) {
        if (active) setMods([]);
        return;
      }
      const { data } = await supabase
        .from("modifications")
        .select("*")
        .eq("model_id", value.model_id)
        .order("name");
      if (active) setMods(data ?? []);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, value.model_id]);

  const find = <X extends { id: number }>(arr: X[], id: number | null) =>
    arr.find((x) => x.id === id) ?? null;

  return (
    <Stack spacing={2}>
      <Autocomplete
        options={groups}
        getOptionLabel={(o) => o.name}
        value={find(groups, value.group_id)}
        onChange={(_, o) =>
          onChange({
            group_id: o?.id ?? null,
            brand_id: null,
            model_id: null,
            modification_id: null,
          })
        }
        renderInput={(p) => <TextField {...p} label="Група" />}
      />
      <Autocomplete
        options={brands}
        disabled={!value.group_id}
        getOptionLabel={(o) => o.name}
        value={find(brands, value.brand_id)}
        onChange={(_, o) =>
          onChange({
            ...value,
            brand_id: o?.id ?? null,
            model_id: null,
            modification_id: null,
          })
        }
        renderInput={(p) => <TextField {...p} label="Бренд" />}
      />
      <Autocomplete
        options={models}
        disabled={!value.brand_id}
        getOptionLabel={(o) => o.name}
        value={find(models, value.model_id)}
        onChange={(_, o) =>
          onChange({ ...value, model_id: o?.id ?? null, modification_id: null })
        }
        renderInput={(p) => <TextField {...p} label="Модель" />}
      />
      <Autocomplete
        options={mods}
        disabled={!value.model_id}
        getOptionLabel={(o) => o.name}
        value={find(mods, value.modification_id)}
        onChange={(_, o) => onChange({ ...value, modification_id: o?.id ?? null })}
        renderInput={(p) => <TextField {...p} label="Модифікація" />}
      />
    </Stack>
  );
}
