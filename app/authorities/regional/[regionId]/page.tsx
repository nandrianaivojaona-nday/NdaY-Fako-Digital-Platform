import {
  ArrowLeft, X, Home, Layers, Users, Map, Truck,
  BarChart3, FileText, LocateFixed
} from "lucide-react";
import Link from "next/link";
import PageNavigation from "@/components/PageNavigation";

export async function generateStaticParams() {
  return [
    { regionId: "1" },
    { regionId: "2" },
    { regionId: "3" },
    { regionId: "4" },
  ];
}

type PageProps = {
  params: Promise<{
    regionId: string;
  }>;
};

export default async function RegionalDashboard({ params }: PageProps) {
  const { regionId } = await params;

  const subRoutes = [
    { name: "Dashboard", icon: Home, path: `/authorities/regional/${regionId}`, desc: "Regional overview" },
    { name: "Zones", icon: Layers, path: `/authorities/regional/${regionId}/zones`, desc: "Manage zones" },
    { name: "Officers", icon: Users, path: `/authorities/regional/${regionId}/officers`, desc: "Regional staff" },
    { name: "Map", icon: Map, path: `/authorities/regional/${regionId}/map`, desc: "Coverage map" },
    { name: "Vehicles", icon: Truck, path: `/authorities/regional/${regionId}/vehicles`, desc: "Fleet and transport" },
    { name: "Reports", icon: FileText, path: `/authorities/regional/${regionId}/reports`, desc: "Regional reports" },
    { name: "Analytics", icon: BarChart3, path: `/authorities/regional/${regionId}/analytics`, desc: "Performance metrics" },
    { name: "Locations", icon: LocateFixed, path: `/authorities/regional/${regionId}/locations`, desc: "Tracked locations" },
  ];

  return (
    <div>
      <PageNavigation />

      <div className="mb-4">
        <Link href="/authorities/regional" className="inline-flex items-center gap-2">
          <ArrowLeft size={18} />
          Back
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Regional Dashboard: {regionId}</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subRoutes.map((route) => {
          const Icon = route.icon;
          return (
            <Link key={route.name} href={route.path} className="rounded-xl border p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} />
                <h2 className="font-semibold">{route.name}</h2>
              </div>
              <p className="text-sm text-gray-600">{route.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
