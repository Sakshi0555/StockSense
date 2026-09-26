import { OperationList } from "../OperationList";

type Params = Promise<{ q?: string; status?: string; view?: string; error?: string }>;

export default async function DeliveriesPage({ searchParams }: { searchParams: Params }) {
  return <OperationList type="DELIVERY" title="Delivery Orders" searchParams={await searchParams} />;
}
