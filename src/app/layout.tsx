// src/app/layout.tsx
import "./globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import { Footer } from "@/components/Footer";
import { Plus_Jakarta_Sans, Tajawal } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const tajawal = Tajawal({ subsets: ["arabic"], variable: "--font-tajawal", weight: ["300","400","500","700"] });

export const metadata = { title: "Rateverse", description: "Modern reviews platform" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${jakarta.className} ${tajawal.className} min-h-screen bg-slate-50 text-slate-900`}>
        <SiteHeader />
        <main className="mx-auto max-w-7xl p-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
