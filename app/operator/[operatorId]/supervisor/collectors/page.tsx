type Props = {
    params: Promise< {operatorId: string }>
  }
  
  async function getCollectors(operatorId: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/app/operator/collectors?operatorId=${operatorId}`,
      { cache: "no-store" }
    )
  
    if (!res.ok) return []
  
    return res.json()
  }
  
  export default async function OperatorCollectorsPage({ params }: Props) {
    const {operatorId} = await params;
    const collectors = await getCollectors(operatorId)
  
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-semibold">Collectors</h1>
  
        <p className="text-sm text-muted-foreground">
          Operator ID: {operatorId}
        </p>
  
        <div className="border rounded p-3 text-sm">
          {collectors.length > 0 ? (
            <pre>{JSON.stringify(collectors, null, 2)}</pre>
          ) : (
            <span>No collectors found</span>
          )}
        </div>
      </div>
    )
  }