"use server";

import { revalidatePath } from "next/cache";
import { errorMessage, redirectWith } from "@/lib/redirect";
import { requirePermission } from "@/lib/session";
import { applyAdjustment } from "@/lib/stock";

// Used by both the Adjustments page and the inline "update" on the Stock page.
export async function adjustStock(formData: FormData) {
  const user = await requirePermission("adjustStock");
  const back = String(formData.get("back") || "/operations/adjustments");
  const productId = Number(formData.get("productId"));
  const locationId = Number(formData.get("locationId"));
  const countedRaw = String(formData.get("countedQty") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!productId || !locationId || countedRaw === "") redirectWith(back, { error: "Product, location and counted quantity are required." });

  let reference = "";
  try {
    reference = (await applyAdjustment({ productId, locationId, countedQty: Number(countedRaw), userId: user.id, reason })).reference;
  } catch (e) {
    redirectWith(back, { error: errorMessage(e) });
  }
  revalidatePath("/", "layout");
  redirectWith(back, { success: `Stock updated (${reference}).` });
}
