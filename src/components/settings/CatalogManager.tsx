"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import type { ColumnDef } from "@tanstack/react-table";
import NumberField from "@/components/NumberField";
import DataTable from "@/components/ui/DataTable";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";
import { formatUAH } from "@/lib/money";
import type { ServiceCatalogItem, ServiceCategory } from "@/lib/types";

type CatalogKind = "service" | "product";

// A row in the tree: either a category (expandable, holds children) or a leaf
// catalog item nested inside its category.
type CatalogNode =
  | { rowType: "category"; key: string; category: ServiceCategory; subRows: CatalogNode[] }
  | { rowType: "item"; key: string; item: ServiceCatalogItem };

function byOrder<T extends { sort_order?: number; name: string }>(a: T, b: T) {
  const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  return so !== 0 ? so : a.name.localeCompare(b.name);
}

// Build the category -> subcategory -> item tree for one kind.
function buildTree(
  kind: CatalogKind,
  categories: ServiceCategory[],
  items: ServiceCatalogItem[],
): CatalogNode[] {
  const cats = categories.filter((c) => c.kind === kind);
  const defaultRoot = cats.find((c) => c.is_default && c.parent_id == null);

  const childCats = new Map<number | null, ServiceCategory[]>();
  for (const c of cats) {
    const list = childCats.get(c.parent_id) ?? [];
    list.push(c);
    childCats.set(c.parent_id, list);
  }

  const kindItems = items.filter((i) =>
    kind === "product" ? i.kind === "product" : i.kind !== "product",
  );
  const itemsByCat = new Map<number, ServiceCatalogItem[]>();
  for (const i of kindItems) {
    const cid = i.category_id ?? defaultRoot?.id;
    if (cid == null) continue;
    const list = itemsByCat.get(cid) ?? [];
    list.push(i);
    itemsByCat.set(cid, list);
  }

  const build = (c: ServiceCategory): CatalogNode => ({
    rowType: "category",
    key: `c${c.id}`,
    category: c,
    subRows: [
      ...(childCats.get(c.id) ?? []).sort(byOrder).map(build),
      ...(itemsByCat.get(c.id) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((i) => ({ rowType: "item", key: `i${i.id}`, item: i }) as CatalogNode),
    ],
  });

  return (childCats.get(null) ?? []).sort(byOrder).map(build);
}

// Flatten categories into a depth-indented list for the parent <Select>.
function flattenCategories(
  kind: CatalogKind,
  categories: ServiceCategory[],
): { cat: ServiceCategory; depth: number }[] {
  const cats = categories.filter((c) => c.kind === kind);
  const childCats = new Map<number | null, ServiceCategory[]>();
  for (const c of cats) {
    const list = childCats.get(c.parent_id) ?? [];
    list.push(c);
    childCats.set(c.parent_id, list);
  }
  const out: { cat: ServiceCategory; depth: number }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const c of (childCats.get(parent) ?? []).sort(byOrder)) {
      out.push({ cat: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

// Ids of a category and everything beneath it — forbidden as a new parent.
function descendantIds(categories: ServiceCategory[], rootId: number): Set<number> {
  const childCats = new Map<number | null, ServiceCategory[]>();
  for (const c of categories) {
    const list = childCats.get(c.parent_id) ?? [];
    list.push(c);
    childCats.set(c.parent_id, list);
  }
  const ids = new Set<number>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of childCats.get(id) ?? []) {
      ids.add(c.id);
      stack.push(c.id);
    }
  }
  return ids;
}

function CategoryDialog({
  kind,
  categories,
  initial,
  presetParent,
  count,
  onClose,
}: {
  kind: CatalogKind;
  categories: ServiceCategory[];
  initial: ServiceCategory | null;
  presetParent: number | null;
  count: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const L = kind === "product" ? T.settings.products : T.settings.services;
  const isEdit = Boolean(initial);
  const defaultRoot = categories.find(
    (c) => c.kind === kind && c.is_default && c.parent_id == null,
  );
  // The seeded "All services"/"All products" root keeps its top-level position;
  // every other category must live under a parent (default: that root).
  const isDefaultRootEdit = isEdit && initial!.is_default && initial!.parent_id == null;

  const [name, setName] = useState(initial?.name ?? "");
  const [parentId, setParentId] = useState<number | null>(
    isEdit ? initial!.parent_id : (presetParent ?? defaultRoot?.id ?? null),
  );
  const [sortOrder, setSortOrder] = useState<number | null>(
    initial?.sort_order ?? count + 1,
  );
  const [saving, setSaving] = useState(false);
  const parentMissing = !isDefaultRootEdit && parentId == null;

  // On edit, exclude the category itself and its descendants as parent options.
  const forbidden = useMemo(
    () =>
      isEdit
        ? descendantIds(categories.filter((c) => c.kind === kind), initial!.id)
        : new Set<number>(),
    [categories, kind, isEdit, initial],
  );
  const parentOptions = useMemo(
    () => flattenCategories(kind, categories).filter((o) => !forbidden.has(o.cat.id)),
    [kind, categories, forbidden],
  );

  async function submit() {
    const clean = name.trim();
    if (!clean || parentMissing) return;
    setSaving(true);
    const row = {
      kind,
      name: clean,
      parent_id: parentId,
      sort_order: sortOrder ?? 0,
    };
    if (isEdit) {
      await supabase.from("service_categories").update(row).eq("id", initial!.id);
    } else {
      await supabase.from("service_categories").insert(row);
    }
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? L.editCategory : L.newCategory}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={L.name}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label={L.parentCategory}
            required={!isDefaultRootEdit}
            error={parentMissing}
            value={parentId == null ? "" : String(parentId)}
            onChange={(e) => setParentId(e.target.value === "" ? null : Number(e.target.value))}
            fullWidth
          >
            {isDefaultRootEdit && <MenuItem value="">{L.rootCategory}</MenuItem>}
            {parentOptions.map(({ cat, depth }) => (
              <MenuItem key={cat.id} value={String(cat.id)}>
                {"  ".repeat(depth)}
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
          <NumberField
            label={T.settings.statuses.sortOrder}
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v)}
            sx={{ width: 140 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving || !name.trim() || parentMissing}
        >
          {T.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ItemDialog({
  kind,
  categories,
  initial,
  presetCategory,
  onClose,
}: {
  kind: CatalogKind;
  categories: ServiceCategory[];
  initial: ServiceCatalogItem | null;
  presetCategory: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isProduct = kind === "product";
  const L = isProduct ? T.settings.products : T.settings.services;
  const isEdit = Boolean(initial);

  const options = useMemo(() => flattenCategories(kind, categories), [kind, categories]);
  const defaultRoot = categories.find(
    (c) => c.kind === kind && c.is_default && c.parent_id == null,
  );

  const [categoryId, setCategoryId] = useState<number | null>(
    initial?.category_id ?? presetCategory ?? defaultRoot?.id ?? null,
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState<number | null>(initial?.price ?? 0);
  const [costPrice, setCostPrice] = useState<number | null>(initial?.cost_price ?? 0);
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [saving, setSaving] = useState(false);

  // Products require an explicit category; services fall back to the default root.
  // Price is mandatory for both.
  const valid = name.trim() && price != null && (!isProduct || categoryId != null);

  async function submit() {
    if (!valid) return;
    setSaving(true);
    const payload: {
      kind: CatalogKind;
      name: string;
      category_id: number | null;
      price: number;
      cost_price: number;
      sku: string | null;
      barcode: string | null;
    } = isProduct
      ? {
          kind: "product",
          name: name.trim(),
          category_id: categoryId,
          price: price ?? 0,
          cost_price: 0,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
        }
      : {
          kind: "service",
          name: name.trim(),
          category_id: categoryId ?? defaultRoot?.id ?? null,
          price: price ?? 0,
          cost_price: costPrice ?? 0,
          sku: null,
          barcode: null,
        };
    if (isEdit) {
      await supabase.from("service_catalog").update(payload).eq("id", initial!.id);
    } else {
      await supabase.from("service_catalog").insert(payload);
    }
    setSaving(false);
    onClose();
    router.refresh();
  }

  const title = isEdit
    ? isProduct
      ? T.settings.products.editProduct
      : T.settings.services.editService
    : isProduct
      ? T.settings.products.newProduct
      : T.settings.services.newService;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label={L.category}
            required={isProduct}
            value={categoryId == null ? "" : String(categoryId)}
            onChange={(e) =>
              setCategoryId(e.target.value === "" ? null : Number(e.target.value))
            }
            fullWidth
          >
            {!isProduct && <MenuItem value="">{L.rootCategory}</MenuItem>}
            {options.map(({ cat, depth }) => (
              <MenuItem key={cat.id} value={String(cat.id)}>
                {"  ".repeat(depth)}
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={L.name}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          {isProduct ? (
            <>
              <TextField
                label={T.settings.products.article}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                fullWidth
              />
              <TextField
                label={T.settings.products.barcode}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                fullWidth
              />
            </>
          ) : (
            <NumberField
              label={T.settings.services.costPrice}
              value={costPrice}
              onValueChange={(v) => setCostPrice(v)}
              fullWidth
            />
          )}
          <NumberField
            label={L.price}
            required
            value={price}
            onValueChange={(v) => setPrice(v)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{T.common.cancel}</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !valid}>
          {T.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CatalogManager({
  kind,
  items,
  categories,
}: {
  kind: CatalogKind;
  items: ServiceCatalogItem[];
  categories: ServiceCategory[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const isProduct = kind === "product";
  const L = isProduct ? T.settings.products : T.settings.services;

  const [catDialog, setCatDialog] = useState<
    { initial: ServiceCategory | null; presetParent: number | null } | null
  >(null);
  const [itemDialog, setItemDialog] = useState<
    { initial: ServiceCatalogItem | null; presetCategory: number | null } | null
  >(null);

  const tree = useMemo(
    () => buildTree(kind, categories, items),
    [kind, categories, items],
  );
  const categoryCount = useMemo(
    () => categories.filter((c) => c.kind === kind).length,
    [categories, kind],
  );
  // Open only the default root ("All services"/"All products") on load; every
  // subcategory starts collapsed.
  const defaultExpanded = useMemo(() => {
    const root = categories.find(
      (c) => c.kind === kind && c.is_default && c.parent_id == null,
    );
    return root ? { [`c${root.id}`]: true } : {};
  }, [categories, kind]);

  async function removeCategory(c: ServiceCategory) {
    if (!window.confirm(L.deleteCategoryConfirm.replace("{name}", c.name))) return;
    await supabase.from("service_categories").delete().eq("id", c.id);
    router.refresh();
  }

  async function removeItem(i: ServiceCatalogItem) {
    if (!window.confirm(L.deleteConfirm.replace("{name}", i.name))) return;
    await supabase.from("service_catalog").delete().eq("id", i.id);
    router.refresh();
  }

  const cols = useMemo<ColumnDef<CatalogNode, any>[]>(() => {
    // First column: the category tree (expand chevrons + category names). Leaf
    // items show nothing here — their name lives in the dedicated Name column.
    const treeCol: ColumnDef<CatalogNode, any> = {
      id: "category",
      header: L.category,
      enableSorting: false,
      size: 320,
      cell: (c) => {
        const row = c.row;
        const node = row.original;
        if (node.rowType !== "category") return null;
        return (
          <Box
            sx={{ display: "flex", alignItems: "center", pl: `${row.depth * 16}px` }}
          >
            {row.getCanExpand() ? (
              <IconButton
                size="small"
                onClick={row.getToggleExpandedHandler()}
                sx={{ mr: 0.5 }}
              >
                {row.getIsExpanded() ? (
                  <KeyboardArrowDownIcon fontSize="small" />
                ) : (
                  <KeyboardArrowRightIcon fontSize="small" />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 30 }} />
            )}
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {node.category.name}
            </Typography>
          </Box>
        );
      },
    };

    const nameCol: ColumnDef<CatalogNode, any> = {
      id: "name",
      header: L.name,
      enableSorting: false,
      size: 260,
      cell: (c) => {
        const node = c.row.original;
        if (node.rowType !== "item") return null;
        return (
          <Typography variant="body2" sx={{ pl: `${c.row.depth * 16}px` }}>
            {node.item.name}
          </Typography>
        );
      },
    };

    const priceCol: ColumnDef<CatalogNode, any> = {
      id: "price",
      header: L.price,
      enableSorting: false,
      cell: (c) =>
        c.row.original.rowType === "item"
          ? formatUAH(c.row.original.item.price)
          : "",
    };

    const actionsCol: ColumnDef<CatalogNode, any> = {
      id: "actions",
      header: "",
      enableSorting: false,
      size: 132,
      enableResizing: false,
      cell: (c) => {
        const node = c.row.original;
        if (node.rowType === "category") {
          const cat = node.category;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={L.newSubcategory}>
                <IconButton
                  size="small"
                  onClick={() => setCatDialog({ initial: null, presetParent: cat.id })}
                >
                  <CreateNewFolderIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={() => setCatDialog({ initial: cat, presetParent: cat.parent_id })}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              {!cat.is_default && (
                <IconButton size="small" onClick={() => removeCategory(cat)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          );
        }
        const item = node.item;
        return (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() =>
                setItemDialog({ initial: item, presetCategory: item.category_id })
              }
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => removeItem(item)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      },
    };

    if (isProduct) {
      return [
        treeCol,
        nameCol,
        {
          id: "sku",
          header: T.settings.products.article,
          enableSorting: false,
          cell: (c) =>
            c.row.original.rowType === "item" ? (c.row.original.item.sku ?? "—") : "",
        },
        {
          id: "barcode",
          header: T.settings.products.barcode,
          enableSorting: false,
          cell: (c) =>
            c.row.original.rowType === "item" ? (c.row.original.item.barcode ?? "—") : "",
        },
        priceCol,
        actionsCol,
      ];
    }
    return [
      treeCol,
      nameCol,
      {
        id: "cost_price",
        header: T.settings.services.costPrice,
        enableSorting: false,
        cell: (c) =>
          c.row.original.rowType === "item"
            ? formatUAH(c.row.original.item.cost_price)
            : "",
      },
      priceCol,
      actionsCol,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProduct, L]);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setCatDialog({ initial: null, presetParent: null })}
        >
          {L.newCategory}
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setItemDialog({ initial: null, presetCategory: null })}
        >
          {isProduct ? T.settings.products.newProduct : T.settings.services.newService}
        </Button>
      </Stack>

      <DataTable
        data={tree}
        columns={cols}
        getSubRows={(n) => (n.rowType === "category" ? n.subRows : undefined)}
        getRowId={(n) => n.key}
        defaultExpanded={defaultExpanded}
        storageKey={isProduct ? "settings-products" : "settings-services"}
      />

      {catDialog && (
        <CategoryDialog
          key={catDialog.initial?.id ?? `new-${catDialog.presetParent ?? "root"}`}
          kind={kind}
          categories={categories}
          initial={catDialog.initial}
          presetParent={catDialog.presetParent}
          count={categoryCount}
          onClose={() => setCatDialog(null)}
        />
      )}
      {itemDialog && (
        <ItemDialog
          key={itemDialog.initial?.id ?? "new"}
          kind={kind}
          categories={categories}
          initial={itemDialog.initial}
          presetCategory={itemDialog.presetCategory}
          onClose={() => setItemDialog(null)}
        />
      )}
    </Box>
  );
}
