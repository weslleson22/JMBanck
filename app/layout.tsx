import type { Metadata, Viewport } from "next";
import { inter, plusJakartaSans, jetbrainsMono } from "./fonts";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import RoleGuard from "@/components/RoleGuard";
import { Toaster } from "sonner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "JM Bank – Banco Digital Escolar",
  description: "Plataforma de educação financeira, carômetro e gamificação escolar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="font-sans flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
          <RoleGuard>{children}</RoleGuard>
        </div>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{ className: "font-sans text-sm" }}
        />
      </body>
    </html>
  );
}
