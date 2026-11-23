import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "ARSANN — technical test routes",
  description: "Debug/baseline routes for the Scene 01 3D pipeline (not the website).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
