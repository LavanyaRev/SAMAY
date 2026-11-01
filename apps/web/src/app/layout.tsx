import type { Metadata } from "next";
import "@/styles/tokens.css";
import { AppProvider } from "@/lib/app-context";

export const metadata: Metadata = {
  title: "SAMAY — Smart AICTE Monitoring & Approval Yojana",
  description:
    "SAMAY statutory regulatory platform for AICTE institutional approvals, scrutiny, EVC inspections, undertakings, and SLA pendency monitoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#FAFAFA] font-sans text-[#2A1810] antialiased selection:bg-[#EC642A] selection:text-white"
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
