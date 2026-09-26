import { Field, Input, Select } from "@/components/ui";

type Product = {
  name: string;
  sku: string;
  uom: string;
  cost: number;
  reorderMin: number;
  reorderQty: number;
  categoryId: number | null;
};

export function ProductFields({ product, categories }: { product?: Product; categories: { id: number; name: string }[] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" required defaultValue={product?.name} placeholder="Steel Rods" />
        </Field>
        <Field label="SKU / Code">
          <Input name="sku" required defaultValue={product?.sku} placeholder="STEEL001" />
        </Field>
        <Field label="Category">
          <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unit of measure">
          <Input name="uom" defaultValue={product?.uom ?? "Units"} list="uoms" />
          <datalist id="uoms">
            {["Units", "kg", "g", "L", "m", "Boxes", "Pairs"].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
        <Field label="Cost per unit (₹)">
          <Input name="cost" type="number" min="0" step="0.01" defaultValue={product?.cost ?? 0} />
        </Field>
      </div>
      <div className="mt-6 border-t border-zinc-800 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-rose-300">Reordering rule</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Low-stock threshold">
            <Input name="reorderMin" type="number" min="0" defaultValue={product?.reorderMin ?? 0} />
          </Field>
          <Field label="Reorder quantity">
            <Input name="reorderQty" type="number" min="0" defaultValue={product?.reorderQty ?? 0} />
          </Field>
        </div>
      </div>
    </>
  );
}
