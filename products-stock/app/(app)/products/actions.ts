"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { errorMessage, redirectWith } from "@/lib/redirect";
import { requirePermission } from "@/lib/session";
import { applyAdjustment } from "@/lib/stock";

function readProduct(formData: FormData) {
  const categoryId = Number(formData.get("categoryId")) || null;
  return {
    name: String(formData.get("name") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim().toUpperCase(),
    uom: String(formData.get("uom") ?? "Units").trim() || "Units",
    cost: Number(formData.get("cost")) || 0,
    reorderMin: Math.max(0, Number(formData.get("reorderMin")) || 0),
    reorderQty: Math.max(0, Number(formData.get("reorderQty")) || 0),
    categoryId,
  };
}

export async function createProduct(formData: FormData) {
  const user = await requirePermission("manageProducts", "/products");
  const data = readProduct(formData);
  const initialQty = Number(formData.get("initialQty")) || 0;
  const locationId = Number(formData.get("locationId")) || 0;
  if (!data.name || !data.sku) redirectWith("/products/new", { error: "Name and SKU are required." });
  if (initialQty > 0 && !locationId) redirectWith("/products/new", { error: "Choose a location for the initial stock." });

  let productId = 0;
  try {
    productId = (await prisma.product.create({ data })).id;
    // Initial stock goes through an adjustment so it appears in the ledger.
    if (initialQty > 0) {
      await applyAdjustment({ productId, locationId, countedQty: initialQty, userId: user.id, reason: "Initial stock" });
    }
  } catch (e) {
    redirectWith("/products/new", { error: errorMessage(e) });
  }
  revalidatePath("/products");
  redirectWith(`/products/${productId}`, { success: "Product created." });
}

export async function updateProduct(formData: FormData) {
  await requirePermission("manageProducts", "/products");
  const id = Number(formData.get("id"));
  const data = readProduct(formData);
  if (!data.name || !data.sku) redirectWith(`/products/${id}`, { error: "Name and SKU are required." });
  try {
    await prisma.product.update({ where: { id }, data });
  } catch (e) {
    redirectWith(`/products/${id}`, { error: errorMessage(e) });
  }
  revalidatePath("/products");
  redirectWith(`/products/${id}`, { success: "Product updated." });
}

export async function createCategory(formData: FormData) {
  await requirePermission("manageProducts", "/products");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectWith("/products/categories", { error: "Category name is required." });
  try {
    await prisma.category.create({ data: { name } });
  } catch (e) {
    redirectWith("/products/categories", { error: errorMessage(e) });
  }
  revalidatePath("/products/categories");
  redirectWith("/products/categories", { success: `Category "${name}" created.` });
}
