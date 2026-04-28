"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Layout, BarChart3, Puzzle, Shield, Sparkles, Rocket, CheckCircle2, ArrowRight, Lightbulb, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocSection = {
  heading: string;
  paragraphs: string[];
  tips?: string[];
};

type DocContent = {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  description: string;
  features: string[];
  sections: DocSection[];
  useCases: { title: string; desc: string }[];
  faq: { q: string; a: string }[];
};

const CONTENT: Record<string, DocContent> = {
  "form-builder": {
    title: "Interactive Form Builder",
    subtitle: "The most intuitive drag-and-drop experience for modern teams.",
    icon: Layout,
    color: "bg-blue-500",
    description: "Our form builder is designed to be powerful yet simple. No more fighting with complex interfaces. Just drag, drop, and publish.",
    features: [
      "Real-time visual preview as you build",
      "Over 20+ field types including file uploads",
      "Section and page break management",
      "Rich text support for descriptions",
      "Auto-save so you never lose your work"
    ],
    sections: [
      {
        heading: "Getting Started",
        paragraphs: [
          "Create your first form in under three minutes. Click New Form in your dashboard, give it a title, and start adding fields from the sidebar. Every change is saved automatically.",
          "Use the drag handle on each field to reorder questions. Sections and page breaks help you organize long forms into digestible chunks. Preview anytime to see exactly what respondents will experience."
        ]
      },
      {
        heading: "Field Types Overview",
        paragraphs: [
          "FormTo.Link supports 24 field types organized into text (short, long, email, phone, URL), choice (select, multi-select, checkbox, radio, ranking), input (number, date, time, rating, file), and layout (section, page break, paragraph, divider, video, radio grid, checkbox grid).",
          "Each field has its own configuration panel. Set labels, placeholders, descriptions, validation rules, and whether a response is required. File uploads support images and documents up to your plan limits."
        ]
      },
      {
        heading: "Publishing and Sharing",
        paragraphs: [
          "When your form is ready, set its status to Active and choose a unique slug. Your form becomes instantly available at formto.link/f/your-slug.",
          "Control who can respond with optional authentication, one-response-per-user limits, and scheduled open/close windows. Generate a QR code for in-person events or print materials."
        ],
        tips: ["Start with 5-7 fields for highest completion rates", "Use page breaks every 8-10 fields on mobile", "Always preview on a phone before publishing"]
      }
    ],
    useCases: [
      { title: "Lead Capture", desc: "Build a minimal name + email form with a custom redirect to your thank-you page." },
      { title: "Event RSVP", desc: "Use date pickers, dropdowns for meal preference, and capacity limits to manage sign-ups." },
      { title: "Job Application", desc: "Collect resumes with file uploads, structured questions, and multi-page sections." }
    ],
    faq: [
      { q: "Can I duplicate an existing form?", a: "Yes. Open any form, click the menu in the top-right, and select Duplicate. This creates a copy with all fields, logic, and settings intact." },
      { q: "Is there a limit to how many fields I can add?", a: "There is no hard limit. However, we recommend keeping forms under 30 fields for the best respondent experience and completion rates." }
    ]
  },
  "analytics": {
    title: "Insightful Analytics",
    subtitle: "Turn submissions into actionable data.",
    icon: BarChart3,
    color: "bg-emerald-500",
    description: "Don't just collect data—understand it. Our analytics dashboard provides clear visualizations of your form performance.",
    features: [
      "Submission volume over time charts",
      "Detailed field-level breakdown stats",
      "Average completion time tracking",
      "Choice and rating distribution charts",
      "Export to CSV, XLSX, or PDF formats"
    ],
    sections: [
      {
        heading: "Submission Trends",
        paragraphs: [
          "The analytics dashboard opens with a daily submission volume chart. Spot spikes after email campaigns, social posts, or product launches. Hover over any point to see the exact count for that day.",
          "All charts are rendered client-side for speed and update in real time as new responses arrive. You can filter by date range to isolate specific campaigns or seasons."
        ]
      },
      {
        heading: "Field-Level Breakdowns",
        paragraphs: [
          "Every choice, rating, and scale field gets its own distribution chart. See which options are most popular, identify outliers, and spot trends in qualitative data.",
          "For text fields, view a word-frequency summary and read full responses in a scrollable list. Ratings and scales are aggregated into averages with standard deviation indicators."
        ]
      },
      {
        heading: "Exporting Data",
        paragraphs: [
          "Export your entire response set or a filtered subset at any time. CSV works best for spreadsheets, XLSX preserves formatting, and PDF generates a print-ready report with charts embedded.",
          "Exports include all metadata: submission time, completion duration, device type, and IP hash for deduplication analysis."
        ],
        tips: ["Wait at least 24 hours after launch before drawing conclusions", "Export before archiving a form to keep historical data offline", "Use date filters to compare pre/post campaign performance"]
      }
    ],
    useCases: [
      { title: "Campaign Tracking", desc: "Monitor daily submission spikes to measure the impact of a product launch email." },
      { title: "Product Feedback", desc: "Analyze rating distributions to identify which features users love most." },
      { title: "Audit Reports", desc: "Export a PDF summary of all responses for stakeholder reviews or compliance." }
    ],
    faq: [
      { q: "Do analytics update in real time?", a: "Yes. As soon as a respondent submits, the charts refresh automatically. There is no need to refresh the page manually." },
      { q: "Can I share analytics with my team?", a: "Anyone with editor access to the workspace can view the analytics tab. Viewer roles can see responses but not analytics dashboards." }
    ]
  },
  "logic-branching": {
    title: "Logic & Branching",
    subtitle: "Forms that adapt to your users.",
    icon: Puzzle,
    color: "bg-purple-500",
    description: "Create smart forms that adapt to user responses in real-time. Only show relevant questions and improve completion rates.",
    features: [
      "Conditional field visibility (Show/Hide)",
      "Skip to specific pages or sections",
      "Mathematical formula support",
      "Set field values automatically",
      "Redirect to URLs based on answers"
    ],
    sections: [
      {
        heading: "Creating Your First Rule",
        paragraphs: [
          "Open the Logic tab inside any form. Click Add Rule and choose a trigger field. Define the condition—equals, contains, greater than, or is empty—and select the target fields to show or hide.",
          "Rules are evaluated top-down. If multiple rules affect the same field, the last matching rule wins. You can reorder rules by dragging them in the logic panel."
        ]
      },
      {
        heading: "Formula Support",
        paragraphs: [
          "Use formulas to calculate scores, totals, or derived values automatically. Reference other fields by their label or ID. Supported operators include basic arithmetic, conditionals, and string concatenation.",
          "Formula fields update in real time as respondents type, giving immediate feedback. This is ideal for order forms, quizzes, or health assessments."
        ]
      },
      {
        heading: "Skip Logic and Redirects",
        paragraphs: [
          "Page-break logic lets you skip entire sections based on prior answers. A respondent who selects Not interested can jump directly to the closing page.",
          "After submission, redirect respondents to a custom URL based on their answers. Route high-scoring quiz takers to a certificate page and everyone else to a study guide."
        ],
        tips: ["Always test logic with the Preview tool before publishing", "Start simple: one or two rules per form, then expand", "Document complex rules in the form description for your team"]
      }
    ],
    useCases: [
      { title: "Qualification Quiz", desc: "Show pricing fields only if a respondent selects I am a business in an earlier question." },
      { title: "Support Ticket Routing", desc: "Redirect users to the appropriate help article based on the issue category they select." },
      { title: "Dynamic Pricing", desc: "Use formulas to calculate a quote in real time from quantity and unit price fields." }
    ],
    faq: [
      { q: "Is there a limit on how many rules I can create?", a: "Free plans support up to 5 logic rules per form. Pro and Team plans offer unlimited rules." },
      { q: "Do logic rules work on mobile?", a: "Yes. All conditional logic, skip logic, and redirects work exactly the same on mobile and desktop respondents." }
    ]
  },
  "security": {
    title: "Secure Data Collection",
    subtitle: "Enterprise-grade security by default.",
    icon: Shield,
    color: "bg-red-500",
    description: "We take security seriously. Every form and submission is stored securely with modern encryption standards.",
    features: [
      "Secure Supabase-backed infrastructure",
      "JWT-based authentication and authorization",
      "Row-Level Security (RLS) for data privacy",
      "Encrypted file storage and transfers",
      "Protected API access with secure keys"
    ],
    sections: [
      {
        heading: "Infrastructure and Encryption",
        paragraphs: [
          "All data is stored in Supabase with TLS 1.3 encryption in transit and AES-256 at rest. File uploads are scanned and stored in isolated buckets with strict access controls.",
          "Database connections are pooled and audited. We run automated vulnerability scans against our dependencies weekly and patch critical issues within 24 hours of disclosure."
        ]
      },
      {
        heading: "Authentication and Authorization",
        paragraphs: [
          "Users authenticate via email verification and JWT-based sessions. Role-based access control enforces five distinct permission levels: owner, manager, admin, editor, and viewer.",
          "Workspace isolation guarantees that a user in one organization cannot read or modify forms, responses, or assets belonging to another organization."
        ]
      },
      {
        heading: "Compliance and Privacy",
        paragraphs: [
          "We store IP addresses as hashed values only, never raw. This supports deduplication and fraud detection while preserving respondent anonymity.",
          "FormTo.Link is GDPR and CCPA compliant. You can export all personal data for a respondent or delete it permanently within 72 hours of request."
        ],
        tips: ["Require authentication for forms collecting sensitive data", "Set submission limits to prevent spam or abuse", "Regularly audit workspace member roles"]
      }
    ],
    useCases: [
      { title: "Healthcare Intake", desc: "Collect patient information with confidence knowing all data is encrypted and access is strictly role-gated." },
      { title: "Financial Applications", desc: "Use JWT-protected forms and hashed IP logs for audit trails and compliance reporting." },
      { title: "Internal HR Surveys", desc: "Restrict forms to authenticated employees only and ensure responses are visible only to HR managers." }
    ],
    faq: [
      { q: "Is FormTo.Link SOC 2 compliant?", a: "We are SOC 2 Type II certified. Our audit reports are available to Team plan customers under NDA." },
      { q: "Where is my data physically stored?", a: "Primary storage is in US-East (Virginia) with optional EU-West (Ireland) residency for Team plans." }
    ]
  },
  "branding": {
    title: "Customization",
    subtitle: "Match your forms to your style.",
    icon: Sparkles,
    color: "bg-amber-500",
    description: "Make your forms look professional and integrated. Control the visual presentation to match your project's identity.",
    features: [
      "Custom accent color selection",
      "Personalized success messages",
      "Branded redirect destinations",
      "Clean, distraction-free layouts",
      "Mobile-responsive design themes"
    ],
    sections: [
      {
        heading: "Accent Colors and Themes",
        paragraphs: [
          "Pick a primary accent color from the design panel. It applies to buttons, active states, and the progress indicator. The rest of the form uses a clean, neutral palette that adapts automatically to light and dark modes.",
          "For Pro and Team plans, you can remove the FormTo.Link branding entirely. The form renders as a standalone experience with your own brand identity."
        ]
      },
      {
        heading: "Success Messages and Redirects",
        paragraphs: [
          "Replace the default thank-you message with something personal. Celebrate a submission, explain next steps, or embed a video. You can also redirect respondents to any URL after submission.",
          "Redirects support dynamic parameters. Send respondents to a confirmation page, a payment gateway, or a personalized results dashboard based on their answers."
        ]
      },
      {
        heading: "Mobile-First Design",
        paragraphs: [
          "Every form template is responsive by default. Touch targets are at least 44 pixels, font sizes scale with accessibility settings, and page breaks are optimized for thumb-scrolling.",
          "Test your form on any device directly from the builder. Toggle between desktop, tablet, and phone previews without leaving the editor."
        ],
        tips: ["Keep success messages under 50 words for higher retention", "Test on a real phone, not just the emulator", "Use contrasting accent colors for accessibility compliance"]
      }
    ],
    useCases: [
      { title: "Product Launch Survey", desc: "Use brand colors and a celebratory success message to reinforce the launch narrative." },
      { title: "Agency Client Forms", desc: "Remove all FormTo.Link branding so the form feels like a native part of the client's site." },
      { title: "Newsletter Signup", desc: "Redirect subscribers to a custom welcome page with a personalized video or lead magnet." }
    ],
    faq: [
      { q: "Can I use custom fonts?", a: "Custom fonts are available on Team plans. You can upload WOFF2 files or reference Google Fonts by URL." },
      { q: "Does branding affect the builder UI?", a: "No. Branding settings only affect the published form that respondents see. The builder always uses the default theme for consistency." }
    ]
  },
  "integrations": {
    title: "Developer & Team API",
    subtitle: "Connect your data to your stack.",
    icon: Rocket,
    color: "bg-indigo-500",
    description: "Automate your workflow by accessing your form data programmatically via our API and secure keys.",
    features: [
      "Full API access with hashed keys",
      "Real-time collaboration for teams",
      "Programmatic response retrieval",
      "Data export to CSV, XLSX, and PDF",
      "Webhooks and Zapier (Coming Soon)"
    ],
    sections: [
      {
        heading: "API Keys and Authentication",
        paragraphs: [
          "Generate API keys from your team settings. Each key has a unique prefix so you can identify it in logs, and we store only a hash—never the full key. Set expiration dates and revoke keys instantly if needed.",
          "Include the key in the Authorization header as a Bearer token. All API requests must be made over HTTPS. We reject plain HTTP requests at the network layer."
        ]
      },
      {
        heading: "Programmatic Response Retrieval",
        paragraphs: [
          "Fetch responses for any form you own or have editor access to. Results are paginated and support filtering by date range, completion status, and device type.",
          "Responses include full field data, metadata, and calculated formula values. Export endpoints return CSV, XLSX, or PDF streams directly without intermediate storage."
        ]
      },
      {
        heading: "Team Collaboration",
        paragraphs: [
          "Real-time multiplayer editing lets multiple team members work on the same form simultaneously. Cursor positions and field selections are synced live via WebSocket.",
          "Organization workspaces isolate forms, responses, and API keys. Invite members with five granular roles, from viewer (read-only) to owner (full control)."
        ],
        tips: ["Rotate API keys every 90 days for security best practice", "Use server-side calls only—never expose keys in frontend code", "Set up separate keys for production and staging environments"]
      }
    ],
    useCases: [
      { title: "CRM Sync", desc: "Push new form responses into your CRM automatically using the retrieval endpoint every 5 minutes." },
      { title: "Internal Dashboard", desc: "Build a private metrics dashboard that fetches response data and renders custom charts not available in the default analytics." },
      { title: "Slack Notifications", desc: "Set up a lightweight script to poll the API and post new submissions to a Slack channel for real-time alerts." }
    ],
    faq: [
      { q: "How many API keys can I create?", a: "Team plans support up to 25 active keys per organization. Pro plans support 5. Free plans do not include API access." },
      { q: "Is there a rate limit?", a: "Yes. Team plans allow 1,000 requests per hour. Pro plans allow 200 requests per hour. Rate limit headers are included in every response." }
    ]
  },
  "api-reference": {
    title: "API & Developer Tools",
    subtitle: "Build custom integrations and extend FormTo.Link.",
    icon: Rocket,
    color: "bg-violet-500",
    description: "Secure API keys, programmatic access, and developer-friendly tools to extend FormTo.Link into your own stack.",
    features: [
      "Hashed API keys with prefix tracking",
      "Programmatic response retrieval",
      "Secure key storage with last-used timestamps",
      "Webhook support planned for v1.1",
      "Full developer documentation"
    ],
    sections: [
      {
        heading: "Authentication",
        paragraphs: [
          "All API requests require a valid key passed in the Authorization header as Bearer <token>. Keys are generated from the Team Settings page and are visible only once at creation. If you lose a key, revoke it and generate a new one.",
          "Each request is validated against the key hash in our database. We log the prefix, timestamp, and IP address for every request to help you audit usage. Never commit keys to version control."
        ]
      },
      {
        heading: "Endpoints Overview",
        paragraphs: [
          "The current API supports three primary resource categories: Forms (list, retrieve, update status), Responses (list, filter, export), and Organizations (list members, manage invites). All endpoints return JSON and follow REST conventions.",
          "Filtering uses query parameters. For responses, you can filter by form_id, created_at range, and completion_status. Pagination uses limit and offset with Link headers for navigation."
        ]
      },
      {
        heading: "Rate Limits and Error Handling",
        paragraphs: [
          "Team plans are limited to 1,000 requests per hour; Pro plans to 200. When you exceed the limit, the API returns HTTP 429 with a Retry-After header. Implement exponential backoff in your client.",
          "Standard error codes apply: 400 for malformed requests, 401 for invalid keys, 403 for insufficient workspace permissions, 404 for missing resources, and 500 for unexpected server errors."
        ],
        tips: ["Always check X-RateLimit-Remaining before batch jobs", "Handle 429s with exponential backoff starting at 1 second", "Use the /health endpoint to verify connectivity before production deploys"]
      }
    ],
    useCases: [
      { title: "Nightly Backup Script", desc: "Run a cron job that exports all responses from the past 24 hours into your internal data warehouse." },
      { title: "Dynamic Dashboard", desc: "Build a React dashboard that calls the responses endpoint every 60 seconds to show live submission counts." },
      { title: "Form Migration", desc: "Use the forms list endpoint to inventory all forms across workspaces before a team reorganization." }
    ],
    faq: [
      { q: "Is there a GraphQL endpoint?", a: "Not yet. The current API is REST-only. GraphQL is on the long-term roadmap and will be announced on our developer blog when available." },
      { q: "Can I use the API in a client-side browser app?", a: "No. API keys must remain server-side. Exposing them in frontend code is a security violation and will trigger automated key revocation." }
    ]
  },
  "workflow-automation": {
    title: "Workflow Automation",
    subtitle: "Automate your data collection pipeline.",
    icon: Puzzle,
    color: "bg-cyan-500",
    description: "Connect your forms to the rest of your stack and automate repetitive tasks with conditional logic and scheduled actions.",
    features: [
      "Conditional logic and branching rules",
      "Custom redirect URLs on completion",
      "Submission limit and schedule windows",
      "Auto-save and collaboration sync",
      "Webhook support planned for v1.1"
    ],
    sections: [
      {
        heading: "Submission Limits and Scheduling",
        paragraphs: [
          "Set a maximum number of responses to manage capacity for events, limited offers, or beta programs. When the limit is reached, the form automatically closes and displays a custom message.",
          "Schedule forms to open and close at specific dates and times. This is ideal for time-bound surveys, registration windows, or seasonal campaigns. All times use the workspace's configured timezone."
        ]
      },
      {
        heading: "Conditional Logic and Routing",
        paragraphs: [
          "Combine logic rules with redirects to create powerful workflows. A customer who selects Enterprise on a pricing form can be sent to a calendly booking page, while Starter users see a self-checkout link.",
          "Use formulas to calculate intermediate scores or totals, then route respondents to different thank-you pages or follow-up forms based on the calculated result."
        ]
      },
      {
        heading: "Collaboration and Auto-Save",
        paragraphs: [
          "Forms auto-save every few seconds as you edit. If your connection drops, you will resume exactly where you left off. Conflict resolution is built-in for simultaneous edits.",
          "Team members see each other's cursors in real time. Field selections, name changes, and drag operations are synced instantly across all connected clients."
        ],
        tips: ["Set limits before sharing the form publicly to avoid over-subscription", "Use scheduling to create urgency and improve response quality", "Preview logic-heavy forms with sample data before publishing"]
      }
    ],
    useCases: [
      { title: "Course Enrollment", desc: "Cap registrations at 50 students, schedule opening at 9 AM, and redirect accepted students to the payment portal." },
      { title: "Beta Tester Recruitment", desc: "Collect 200 qualified applicants, then redirect high-scoring candidates to an NDA form automatically." },
      { title: "Holiday Order Forms", desc: "Schedule the form to open November 1 and close December 15 with a custom out-of-season message." }
    ],
    faq: [
      { q: "What happens when a form reaches its submission limit?", a: "The form status changes to Closed automatically. Respondents see a custom message you define. You can reopen it by increasing the limit or changing the status manually." },
      { q: "Can I combine limits with conditional logic?", a: "Yes. A form can have both global submission limits and per-option limits (e.g., only 20 vegetarian meal choices). Logic rules continue to evaluate even when limits are active." }
    ]
  }
};

export default function FeatureDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const content = CONTENT[slug as keyof typeof CONTENT];

  if (!content) {
    return (
      <div className="container py-32 text-center">
        <h1 className="text-4xl font-bold mb-4">Resource Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find the resource you're looking for.</p>
        <Button onClick={() => router.push("/resources")}>Back to Resources</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="bg-muted/30 border-b border-border py-12 md:py-20">
        <div className="container px-4 md:px-6">
          <Link
            href="/resources"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Resources
          </Link>
          
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            <div className="flex-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn("p-4 rounded-2xl w-fit text-white", content.color)}
              >
                <content.icon className="h-10 w-10" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold tracking-tight"
              >
                {content.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-muted-foreground leading-relaxed"
              >
                {content.subtitle}
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full lg:w-[400px] bg-card border border-border rounded-3xl p-8 shadow-xl"
            >
              <h3 className="text-xl font-bold mb-6">Key Capabilities</h3>
              <div className="space-y-4">
                {content.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm md:text-base leading-snug">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className="w-full">
                <Button className="w-full mt-8 bg-primary h-12 text-lg font-bold">
                  Try it yourself
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 container px-4 md:px-6">
        <div className="max-w-3xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-4">Overview</h2>
            <p className="text-lg text-muted-foreground leading-loose">{content.description}</p>
          </motion.div>

          {content.sections.map((section, idx) => (
            <motion.div key={section.heading} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }} className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold">{section.heading}</h2>
              <div className="space-y-4">
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="text-base md:text-lg text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
              {section.tips && (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                    <Lightbulb className="h-5 w-5" />
                    <span>Pro Tips</span>
                  </div>
                  <ul className="space-y-2">
                    {section.tips.map((tip, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-2 text-sm md:text-base text-amber-800 dark:text-amber-300">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ))}

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">Use Cases</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.useCases.map((uc, i) => (
                <div key={i} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
                  <h3 className="font-bold text-lg mb-2">{uc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {content.faq.map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-muted/40 border border-border">
                  <div className="flex items-start gap-3 mb-3">
                    <HelpCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <h3 className="font-semibold text-base md:text-lg">{item.q}</h3>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed pl-8">{item.a}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="p-12 rounded-3xl bg-primary text-primary-foreground text-center space-y-6">
             <h3 className="text-3xl font-bold">Ready to use {content.title}?</h3>
             <p className="text-xl opacity-90 max-w-xl mx-auto">
                Join the modern organizations using FormTo.Link to power their data collection and workflows.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="px-8 font-bold text-primary">Get Started Now</Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="px-8 border-white/20 hover:bg-white/10 text-white">Contact Sales</Button>
                </Link>
             </div>
          </div>

          <div className="pt-12 flex items-center justify-between border-t border-border">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Explore More</p>
                <Link href="/resources" className="text-xl font-bold hover:text-primary transition-colors flex items-center gap-2">
                   Browse all resources
                   <ArrowRight className="h-5 w-5" />
                </Link>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

