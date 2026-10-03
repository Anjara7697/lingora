import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import "./globals.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["700"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Lingora",
  description: "Learn. Speak. Grow.",
  appleWebApp: { capable: true, title: "Lingora", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#172554" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AuthProvider>
          {children}
          <PwaProvider />
        </AuthProvider></body>
    </html>
  );
}
