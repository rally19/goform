"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRICING_PLANS = [
  {
    name: "Free",
    price: "0",
    description: "Perfect for side projects and individuals.",
    features: [
      "Up to 3 forms",
      "100 submissions/month",
      "20+ field types",
      "Basic analytics",
      "FormTo.Link branding",
    ],
    cta: "Start for Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "29",
    description: "For growing businesses and professionals.",
    features: [
      "Unlimited forms",
      "5,000 submissions/month",
      "File Upload field",
      "Advanced logic & formulas",
      "Remove branding",
      "Custom redirect URLs",
      "Insightful analytics",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Team",
    price: "99",
    description: "Collaboration and power for busy teams.",
    features: [
      "Everything in Pro",
      "25,000 responses/month",
      "Collaborative editing",
      "API access with secure keys",
      "Organization management",
      "Priority email support",
      "Multiple workspaces",
    ],
    cta: "Get Started",
    popular: false,
  },
];

const FAQS = [
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, the change will take effect immediately. If you downgrade, the change will take effect at the end of your current billing cycle.",
  },
  {
    question: "Do you offer a free trial?",
    answer: "We offer a fully featured Free plan to get you started. You can upgrade to a Pro or Team plan whenever you're ready to scale your operations.",
  },
  {
    question: "What happens if I exceed my submission limit?",
    answer: "We'll notify you when you approach your limit. You can upgrade at any time, and we provide a short grace period so your forms never stop collecting data unexpectedly.",
  },
  {
    question: "Is my data secure?",
    answer: "Security is our top priority. All data is encrypted at rest and in transit with Supabase Row-Level Security. We store IP hashes only and are fully GDPR and CCPA compliant.",
  },
];

export default function PricingPageClient() {
  const [isAnnual, setIsAnnual] = React.useState(true);

  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="py-20 md:py-32 bg-muted/30 border-b border-border">
        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6"
          >
            Simple, Transparent Pricing
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
          >
            Choose the plan that's <span className="text-primary">right for you</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xl max-w-[600px] mb-12"
          >
            From solo founders to global enterprises, we have a plan that fits your needs and budget.
          </motion.p>

          <div className="flex items-center gap-4 mb-12">
            <Label htmlFor="billing-toggle" className={!isAnnual ? "font-bold" : "text-muted-foreground"}>Monthly</Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="billing-toggle" className={isAnnual ? "font-bold" : "text-muted-foreground"}>Annually</Label>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                Save 20%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PRICING_PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col p-8 rounded-3xl border transition-all",
                plan.popular ? "border-primary shadow-2xl scale-105 bg-card z-10" : "border-border bg-card hover:border-primary/40"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                   <span className="text-5xl font-bold">${isAnnual ? Math.floor(Number(plan.price) * 0.8) : plan.price}</span>
                   <span className="text-muted-foreground font-medium">/month</span>
                </div>
                {isAnnual && plan.price !== "0" && (
                   <p className="text-xs text-emerald-500 font-medium mt-2">Billed annually (${Math.floor(Number(plan.price) * 0.8 * 12)}/year)</p>
                )}
              </div>

              <div className="space-y-4 mb-10 flex-1">
                 {plan.features.map((feature) => (
                   <div key={feature} className="flex items-start gap-3">
                      <div className="mt-1 bg-primary/10 rounded-full p-0.5">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm leading-snug">{feature}</span>
                   </div>
                 ))}
              </div>

              <Link href="/login" className="w-full">
                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className={cn("w-full h-12 text-lg font-bold", plan.popular && "shadow-lg shadow-primary/20")}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-24 container px-4 md:px-6">
         <div className="rounded-3xl bg-muted/50 border border-border p-12 flex flex-col md:flex-row items-center justify-between gap-8 max-w-5xl mx-auto">
            <div className="space-y-4 text-center md:text-left">
               <h2 className="text-3xl font-bold">Need something more?</h2>
               <p className="text-muted-foreground text-lg max-w-md">
                 For large-scale operations with specific security and compliance needs, our Enterprise plan is the best fit.
               </p>
            </div>
            <Link href="/enterprise">
               <Button size="lg" className="px-8 h-12 text-lg font-bold group">
                 Explore Enterprise
                 <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
               </Button>
            </Link>
         </div>
      </section>

      {/* FAQs */}
      <section className="py-24 md:py-32 bg-muted/30 border-t border-border">
         <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
               <p className="text-muted-foreground text-lg max-w-[600px]">
                 Got questions? We've got answers. If you can't find what you're looking for, feel free to reach out.
               </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
               {FAQS.map((faq, i) => (
                 <motion.div
                   key={faq.question}
                   initial={{ opacity: 0, y: 10 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.05 }}
                   className="p-8 rounded-2xl bg-card border border-border"
                 >
                    <div className="flex gap-4">
                       <HelpCircle className="h-6 w-6 text-primary shrink-0" />
                       <div className="space-y-2">
                          <h3 className="text-lg font-bold">{faq.question}</h3>
                          <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                       </div>
                    </div>
                 </motion.div>
               ))}
            </div>
         </div>
      </section>
    </div>
  );
}

