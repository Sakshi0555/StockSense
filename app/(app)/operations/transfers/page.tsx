import { OperationList } from "../OperationList";

type Params = Promise<{ q?: string; status?: string; view?: string; error?: string }>;

export default async function TransfersPage({ searchParams }: { searchParams: Params }) {
  return <OperationList type="INTERNAL" title="Internal Transfers" searchParams={await searchParams} />;
}
