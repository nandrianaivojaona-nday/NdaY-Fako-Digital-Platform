export default function OperatorWMS() {

    return (
      <div className="p-10">
  
        <h1 className="text-3xl font-bold mb-10">
          NdaY'Fako Waste Management System
        </h1>
  
        <div className="grid grid-cols-3 gap-6">
  
          <a href="/operator/wms/collectors" className="p-6 bg-green-500 text-white rounded">
            Collectors
          </a>
  
          <a href="/operator/wms/vehicles" className="p-6 bg-blue-500 text-white rounded">
            Vehicles
          </a>
  
          <a href="/operator/wms/bins" className="p-6 bg-yellow-500 text-white rounded">
            Waste Bins
          </a>
  
          <a href="/operator/wms/routes" className="p-6 bg-purple-500 text-white rounded">
            Routes
          </a>
  
          <a href="/operator/wms/pickups" className="p-6 bg-gray-700 text-white rounded">
            Pickups
          </a>
  
          <a href="/operator/wms/recycling" className="p-6 bg-teal-600 text-white rounded">
            Recycling
          </a>
  
        </div>
  
      </div>
    )
  }