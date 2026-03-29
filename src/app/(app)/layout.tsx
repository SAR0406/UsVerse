import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen relative">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-purple-900/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-pink-900/10 blur-3xl" />
        </div>
        {children}
      </main>
    </div>
  );
}
