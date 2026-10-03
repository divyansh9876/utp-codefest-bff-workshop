import { Geist, Geist_Mono } from "next/font/google";
import Analytics from "@/components/Analytics";
import { HOST, SITE_URL } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = `${HOST.name} · Backend Engineer (Java & Spring Boot)`;
const DESCRIPTION = `${HOST.name} is a backend engineer building secure, production-ready APIs with Java, Spring Boot and MongoDB. Projects, the UTP CodeFest BFF workshop, and how to get in touch.`;
const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: HOST.name,
  keywords: [
    HOST.name,
    "Divyansh",
    "Backend Engineer",
    "Java",
    "Spring Boot",
    "MongoDB",
    "JWT",
    "Backend-for-Frontend",
    "BFF",
    "UTP CodeFest",
  ],
  authors: [{ name: HOST.name, url: HOST.linkedin }],
  creator: HOST.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: HOST.name,
    title: TITLE,
    description: DESCRIPTION,
    firstName: "Divyansh",
    lastName: "Bhatt",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
  ...(GOOGLE_VERIFICATION && { verification: { google: GOOGLE_VERIFICATION } }),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
