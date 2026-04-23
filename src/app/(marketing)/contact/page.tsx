import { Metadata } from "next";
import ContactPageClient from "./_client";

export const metadata: Metadata = {
  title: "Contact Us | FormTo.Link",
  description: "Get in touch with the FormTo.Link team. We're here to help you with any questions or support you need.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
