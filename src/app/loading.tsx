import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-purple-100 animate-pulse mx-auto mb-4" />
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}
