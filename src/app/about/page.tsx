import type { Metadata } from "next";

import { AboutPage } from "@/components/about-page";

export const metadata: Metadata = {
  title: "About — BluePrint",
};

export default function AboutRoute() {
  return <AboutPage />;
}
