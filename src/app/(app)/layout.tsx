import Navbar from "@/components/Navbar";
import LivingCanvas from "@/components/LivingCanvas";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen relative">
        <LivingCanvas />
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl bg-[radial-gradient(circle_at_center,rgba(255,107,157,0.22)_0%,transparent_70%)]" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl bg-[radial-gradient(circle_at_center,rgba(200,182,226,0.24)_0%,transparent_70%)]" />
        </div>
        {children}
      </main>
    </div>
  );
}
