"use client";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
