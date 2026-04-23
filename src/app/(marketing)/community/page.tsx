import { Metadata } from "next";
import CommunityPageClient from "./_client";

export const metadata: Metadata = {
  title: "Community | FormTo.Link",
  description: "Join the FormTo.Link community. Connect with other users, share tips, and learn from experts.",
};

export default function CommunityPage() {
  return <CommunityPageClient />;
}
