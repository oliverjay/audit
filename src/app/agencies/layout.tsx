import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "White Label Website Audit for Agencies | Retake",
  description:
    "Install a white-label AI website audit on your agency website and automatically capture qualified client leads.",
  openGraph: {
    title: "White Label Website Audit for Agencies | Retake",
    description:
      "Install a white-label AI website audit on your agency website and automatically capture qualified client leads.",
    siteName: "Retake",
    type: "website",
  },
};

export default function AgenciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
