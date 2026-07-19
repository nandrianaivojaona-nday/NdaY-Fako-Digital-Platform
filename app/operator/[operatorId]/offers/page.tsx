// app/operator/[operatorId]/offers/page.tsx

type Props = {
  params: Promise<{ operatorId: string }>;
};

async function getOffers(operatorId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/app/operator/offers?operatorId=${operatorId}`,
    { cache: "no-store" }
  );

  if (!res.ok) return [];

  return res.json();
}

export default async function OperatorOffersPage({ params }: Props) {
  const { operatorId } = await params;
  const offers = await getOffers(operatorId);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Offers</h1>

      <p className="text-sm text-muted-foreground">
        Operator ID: {operatorId}
      </p>

      <div className="border rounded p-3 text-sm">
        {offers.length > 0 ? (
          <pre>{JSON.stringify(offers, null, 2)}</pre>
        ) : (
          <span>No offers found</span>
        )}
      </div>
    </div>
  );
}