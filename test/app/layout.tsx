import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anum Vista",
  description: "Property management dashboard",
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tenants", label: "Tenants" },
  { href: "/transactions", label: "Transactions" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f5f6fa] text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <aside className="w-[240px] shrink-0 bg-[#1e2a3a] text-white">
            <div className="border-b border-white/10 px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                Anum Vista
              </p>
              <h1 className="mt-1 text-lg font-semibold text-white">
                Finance Portal
              </h1>
            </div>

            <nav className="px-3 py-5">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block text-gray-300 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 text-sm font-medium transition"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <main className="min-h-screen flex-1 bg-[#f5f6fa] p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
