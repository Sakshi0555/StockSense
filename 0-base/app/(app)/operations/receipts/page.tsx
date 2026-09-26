import { OperationList } from "../OperationList";

type Params = Promise<{ q?: string; status?: string; view?: string; error?: string }>;

export default async function ReceiptsPage({ searchParams }: { searchParams: Params }) {
  return <OperationList type="RECEIPT" title="Receipts" searchParams={await searchParams} />;
}
