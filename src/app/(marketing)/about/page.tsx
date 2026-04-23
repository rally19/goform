import { Metadata } from "next";
import AboutPageClient from "./_client";

export const metadata: Metadata = {
  title: "About Us | FormTo.Link",
  description: "Learn more about the mission, team, and values behind FormTo.Link.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
