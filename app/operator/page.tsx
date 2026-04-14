export default function OperatorPage() {

    return (
      <main className="flex flex-col">
  
        {/* HERO */}
  
        <section className="text-center py-20">
  
          <h1 className="text-4xl font-bold mb-6">
            Operate Your Waste Services with NdaY'Fako
          </h1>
  
          <p className="text-lg mb-8">
            Manage fleets, track waste collection, and connect to the circular economy.
          </p>
  
          <a
            href="/operator/register"
            className="bg-green-600 text-white px-6 py-3 rounded"
          >
            Register as Operator
          </a>
  
        </section>
  
        {/* BENEFITS */}
  
        <section className="grid grid-cols-2 gap-10 p-10">
  
          <div>
            <h3 className="font-bold text-xl">Fleet Management</h3>
            <p>Manage collectors, vehicles, and routes.</p>
          </div>
  
          <div>
            <h3 className="font-bold text-xl">Waste Tracking</h3>
            <p>Track waste collection using QR bins.</p>
          </div>
  
          <div>
            <h3 className="font-bold text-xl">Customer Management</h3>
            <p>Manage household subscriptions.</p>
          </div>
  
          <div>
            <h3 className="font-bold text-xl">Circular Economy</h3>
            <p>Sell recycled materials and compost.</p>
          </div>
  
        </section>
  
      </main>
    )
  }