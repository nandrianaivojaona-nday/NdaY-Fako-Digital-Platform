type Props = {
    params: Promise<{ operatorId: string }>
  }
  
  async function getVehicles(operatorId: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/app/operator/vehicles?operatorId=${operatorId}`,
      { cache: "no-store" }
    )
  
    if (!res.ok) return []
  
    return res.json()
  }
  
  export default async function OperatorVehiclesPage({ params }: Props) {
    const { operatorId } = await params
    const vehicles = await getVehicles(operatorId)
  
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-semibold">Vehicles</h1>
  
        <p className="text-sm text-muted-foreground">
          Operator ID: {operatorId}
        </p>
  
        <div className="border rounded p-3 text-sm">
          {vehicles.length > 0 ? (
            <pre>{JSON.stringify(vehicles, null, 2)}</pre>
          ) : (
            <span>No vehicles found</span>
          )}
        </div>
      </div>
    )
  }