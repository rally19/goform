import { Metadata } from "next";
import CareersPageClient from "./_client";

export const metadata: Metadata = {
  title: "Careers | FormTo.Link",
  description: "Join the team building the future of data collection. View our open positions and learn about our culture.",
};

export default function CareersPage() {
  return <CareersPageClient />;
}
