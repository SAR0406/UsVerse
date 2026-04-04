import Navbar from "@/components/Navbar";
import LivingCanvas from "@/components/LivingCanvas";
import QueryProvider from "@/components/QueryProvider";
import ToastProvider from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <div className="flex min-h-screen safe-area">
          <Navbar />
          <main className="flex-1 md:ml-64 pb-24 md:pb-4 min-h-screen relative">
            <LivingCanvas />
            {/* Background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
              <div className="absolute top-0 right-0 w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl bg-[radial-gradient(circle_at_center,rgba(255,107,157,0.22)_0%,transparent_70%)]" />
              <div className="absolute bottom-0 left-1/3 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl bg-[radial-gradient(circle_at_center,rgba(200,182,226,0.24)_0%,transparent_70%)]" />
            </div>
            {children}
          </main>
          <ToastProvider />
        </div>
      </QueryProvider>
    </ThemeProvider>
  );
}
