import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoPortal — automotive minisites",
  description:
    "A bilingual (Arabic / English) automotive portal built on Cloudflare D1.",
};

/**
 * Passthrough root.
 *
 * `<html>` / `<body>` are rendered by the two locale root layouts --
 * `(ar)/layout.tsx` for the bare path and `en/layout.tsx` for `/en` -- because
 * `lang` and `dir` belong to the tree that answers the request. Keeping them here
 * instead could only ever describe one of the two languages correctly.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
