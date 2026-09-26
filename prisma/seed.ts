import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { nextReference } from "../lib/reference";
import { applyAdjustment, confirmOperation, validateOperation } from "../lib/stock";

const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  // Start from a clean database so the seed can be re-run.
  await prisma.stockMove.deleteMany();
  await prisma.operationLine.deleteMany();
  await prisma.operation.deleteMany();
  await prisma.stockQuant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      loginId: "admin01",
      email: "admin@stocksense.local",
      name: "Admin",
      role: "MANAGER",
      password: await bcrypt.hash("Admin@123", 10),
    },
  });
  await prisma.user.create({
    data: {
      loginId: "staff01",
      email: "staff@stocksense.local",
      name: "Warehouse Staff",
      role: "STAFF",
      password: await bcrypt.hash("Staff@123", 10),
    },
  });

  const wh = await prisma.warehouse.create({ data: { name: "Main Warehouse", shortCode: "WH", address: "Plot 12, GIDC, Gandhinagar" } });
  const wh2 = await prisma.warehouse.create({ data: { name: "Secondary Warehouse", shortCode: "WH2", address: "Sector 21, Ahmedabad" } });
  const [stock, rackA, production, stock2] = await Promise.all([
    prisma.location.create({ data: { name: "Stock", shortCode: "Stock", warehouseId: wh.id } }),
    prisma.location.create({ data: { name: "Rack A", shortCode: "RackA", warehouseId: wh.id } }),
    prisma.location.create({ data: { name: "Production Floor", shortCode: "Prod", warehouseId: wh.id } }),
    prisma.location.create({ data: { name: "Stock", shortCode: "Stock", warehouseId: wh2.id } }),
  ]);

  const [furniture, raw, office] = await Promise.all(
    ["Furniture", "Raw Materials", "Office Supplies"].map((name) => prisma.category.create({ data: { name } })),
  );

  const p = async (name: string, sku: string, categoryId: number, uom: string, cost: number, reorderMin: number, reorderQty: number) =>
    prisma.product.create({ data: { name, sku, categoryId, uom, cost, reorderMin, reorderQty } });
  const desk = await p("Desk", "DESK001", furniture.id, "Units", 3000, 10, 20);
  const table = await p("Table", "TABL001", furniture.id, "Units", 3000, 10, 20);
  const chair = await p("Office Chair", "CHAIR01", furniture.id, "Units", 1500, 15, 30);
  const steel = await p("Steel Rods", "STEEL01", raw.id, "kg", 80, 50, 200);
  const paper = await p("A4 Paper Ream", "PAPER01", office.id, "Boxes", 250, 20, 50);
  await p("Whiteboard Marker", "MARK001", office.id, "Units", 40, 25, 100);

  // Opening stock (logged as adjustments)
  for (const [productId, locationId, qty] of [
    [desk.id, stock.id, 50],
    [table.id, stock.id, 50],
    [chair.id, stock.id, 8],
    [paper.id, stock2.id, 40],
  ] as const) {
    await applyAdjustment({ productId, locationId, countedQty: qty, userId: user.id, reason: "Opening stock" });
  }

  const makeOp = async (
    type: string,
    data: { contact?: string; address?: string; src?: number; dest?: number; days: number },
    lines: [number, number][],
  ) => {
    const refLocationId = type === "RECEIPT" ? data.dest! : data.src!;
    const loc = await prisma.location.findUniqueOrThrow({ where: { id: refLocationId }, include: { warehouse: true } });
    const reference = await prisma.$transaction((tx) => nextReference(tx, loc.warehouse.shortCode, type));
    return prisma.operation.create({
      data: {
        reference,
        type,
        contact: data.contact,
        address: data.address,
        sourceLocationId: data.src,
        destLocationId: data.dest,
        scheduledDate: daysFromNow(data.days),
        responsibleId: user.id,
        lines: { create: lines.map(([productId, quantity]) => ({ productId, quantity })) },
      },
    });
  };

  // The inventory flow from the problem statement: receive 100 kg steel, move it, deliver 20, 3 kg damaged.
  const r1 = await makeOp("RECEIPT", { contact: "Tata Steel", dest: stock.id, days: -2 }, [[steel.id, 100]]);
  await confirmOperation(r1.id);
  await validateOperation(r1.id);
  const t1 = await makeOp("INTERNAL", { src: stock.id, dest: production.id, days: -1 }, [[steel.id, 100]]);
  await confirmOperation(t1.id);
  await validateOperation(t1.id);
  const d1 = await makeOp("DELIVERY", { contact: "Frame Works Ltd", address: "Vadodara", src: production.id, days: -1 }, [[steel.id, 20]]);
  await confirmOperation(d1.id);
  await validateOperation(d1.id);
  await applyAdjustment({ productId: steel.id, locationId: production.id, countedQty: 77, userId: user.id, reason: "Damaged" });

  // Open operations for the dashboard
  const r2 = await makeOp("RECEIPT", { contact: "Azure Interior", dest: stock.id, days: -1 }, [[desk.id, 6]]);
  await confirmOperation(r2.id); // late & ready
  const r3 = await makeOp("RECEIPT", { contact: "Azure Interior", dest: stock.id, days: 2 }, [[chair.id, 30], [table.id, 10]]);
  await confirmOperation(r3.id);
  await makeOp("RECEIPT", { contact: "Paper Mart", dest: stock2.id, days: 3 }, [[paper.id, 50]]);

  const d2 = await makeOp("DELIVERY", { contact: "Azure Interior", address: "SG Highway, Ahmedabad", src: stock.id, days: 1 }, [[desk.id, 10]]);
  await confirmOperation(d2.id);
  const d3 = await makeOp("DELIVERY", { contact: "Deco Addict", address: "Mumbai", src: stock.id, days: -1 }, [[chair.id, 20]]);
  await confirmOperation(d3.id); // waiting: only 8 chairs
  await makeOp("DELIVERY", { contact: "Gemini Furniture", address: "Pune", src: stock.id, days: 4 }, [[table.id, 5]]);

  await makeOp("INTERNAL", { src: stock.id, dest: rackA.id, days: 1 }, [[desk.id, 15]]);

  console.log("Seeded. Log in with admin01 / Admin@123 (Manager) or staff01 / Staff@123 (Staff)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
