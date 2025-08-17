import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "LEMOS - Landfill Emission Monitoring System",
  description: "Real-time monitoring dashboard for landfill gas emissions with multi-area support and ML forecasting",
  generator: "Next.js",
  keywords: ["landfill", "emission", "monitoring", "gas", "sensors", "ESP32", "IoT"],
  authors: [{ name: "LEMOS Team" }],
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
