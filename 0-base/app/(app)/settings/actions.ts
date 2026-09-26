"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { errorMessage, redirectWith } from "@/lib/redirect";
import { requirePermission } from "@/lib/session";

export async function createWarehouse(formData: FormData) {
  await requirePermission("manageSettings");
  const name = String(formData.get("name") ?? "").trim();
  const shortCode = String(formData.get("shortCode") ?? "").trim().toUpperCase();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name || !shortCode) redirectWith("/settings/warehouses", { error: "Name and short code are required." });

  try {
    // Every warehouse gets a default "Stock" location so it is usable immediately.
    await prisma.warehouse.create({
      data: { name, shortCode, address, locations: { create: { name: "Stock", shortCode: "Stock" } } },
    });
  } catch (e) {
    redirectWith("/settings/warehouses", { error: errorMessage(e) });
  }
  revalidatePath("/settings/warehouses");
  redirectWith("/settings/warehouses", { success: `Warehouse ${shortCode} created.` });
}

export async function updateWarehouse(formData: FormData) {
  await requirePermission("manageSettings");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) redirectWith("/settings/warehouses", { error: "Name is required." });
  await prisma.warehouse.update({ where: { id }, data: { name, address } });
  revalidatePath("/settings/warehouses");
  redirectWith("/settings/warehouses", { success: "Warehouse updated." });
}

export async function createLocation(formData: FormData) {
  await requirePermission("manageSettings");
  const name = String(formData.get("name") ?? "").trim();
  const shortCode = String(formData.get("shortCode") ?? "").trim();
  const warehouseId = Number(formData.get("warehouseId"));
  if (!name || !shortCode || !warehouseId) redirectWith("/settings/locations", { error: "All fields are required." });

  try {
    await prisma.location.create({ data: { name, shortCode, warehouseId } });
  } catch (e) {
    redirectWith("/settings/locations", { error: errorMessage(e) });
  }
  revalidatePath("/settings/locations");
  redirectWith("/settings/locations", { success: `Location ${shortCode} created.` });
}

export async function deleteLocation(formData: FormData) {
  await requirePermission("manageSettings");
  const id = Number(formData.get("id"));
  const [quants, ops] = await Promise.all([
    prisma.stockQuant.count({ where: { locationId: id, quantity: { not: 0 } } }),
    prisma.operation.count({ where: { OR: [{ sourceLocationId: id }, { destLocationId: id }] } }),
  ]);
  if (quants > 0 || ops > 0) {
    redirectWith("/settings/locations", { error: "Location has stock or operations and cannot be deleted." });
  }
  await prisma.stockQuant.deleteMany({ where: { locationId: id } });
  await prisma.location.delete({ where: { id } });
  revalidatePath("/settings/locations");
  redirectWith("/settings/locations", { success: "Location deleted." });
}
