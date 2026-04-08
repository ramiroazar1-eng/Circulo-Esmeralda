import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SwRegister } from "@/components/layout/SwRegister"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Circulo Esmeralda",
  description: "Sistema interno ONG Cannabis Medicinal",
  robots: "noindex, nofollow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "C. Esmeralda",
  },
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png",  sizes: "16x16",  type: "image/png" },
      { url: "/icons/icon-32x32.png",  sizes: "32x32",  type: "image/png" },
      { url: "/icons/icon-96x96.png",  sizes: "96x96",  type: "image/png" },
      { url: "/icons/icon-192x192.png",sizes: "192x192",type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-57x57.png",  sizes: "57x57"  },
      { url: "/icons/icon-60x60.png",  sizes: "60x60"  },
      { url: "/icons/icon-72x72.png",  sizes: "72x72"  },
      { url: "/icons/icon-76x76.png",  sizes: "76x76"  },
      { url: "/icons/icon-114x114.png",sizes: "114x114"},
      { url: "/icons/icon-120x120.png",sizes: "120x120"},
      { url: "/icons/icon-144x144.png",sizes: "144x144"},
      { url: "/icons/icon-152x152.png",sizes: "152x152"},
      { url: "/icons/icon-180x180.png",sizes: "180x180"},
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#0a1a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}><SwRegister />
        {children}
      </body>
    </html>
  )
}

