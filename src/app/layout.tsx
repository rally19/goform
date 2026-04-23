import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FormTo.Link - Modern Form Builder",
    template: "%s | FormTo.Link",
  },
  description: "Create beautiful, interactive forms and collect data effortlessly.",
  keywords: ["form builder", "survey tool", "data collection", "interactive forms", "real-time collaboration"],
  authors: [{ name: "FormTo.Link Team" }],
  creator: "FormTo.Link",
  metadataBase: new URL("https://formto.link"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://formto.link",
    siteName: "FormTo.Link",
    title: "FormTo.Link - Modern Form Builder for Teams",
    description: "Create beautiful, conversion-optimized forms in minutes. The easiest way to collect data and connect with your audience.",
    images: [
      {
        url: "/og-image.png", // User should add this image to public folder
        width: 1200,
        height: 630,
        alt: "FormTo.Link Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FormTo.Link - Modern Form Builder for Teams",
    description: "Create beautiful, conversion-optimized forms in minutes.",
    images: ["/og-image.png"],
    creator: "@formtolink",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
