"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Layout, 
  BarChart3, 
  Puzzle, 
  Shield, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Lightbulb, 
  HelpCircle, 
  Cpu, 
  Users, 
  BookOpen, 
  Search,
  FileText,
  Bookmark,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  category: string;
  description: string;
  features: string[];
  sections: DocSection[];
  useCases: { title: string; desc: string }[];
  faq: { q: string; a: string }[];
};

const DOC_NAVIGATION = [
  { slug: "form-builder", title: "Interactive Form Builder", icon: Layout, category: "Form Creation" },
  { slug: "logic-branching", title: "Logic & Branching", icon: Puzzle, category: "Logic & Rules" },
  { slug: "branding", title: "Design & Customization", icon: Sparkles, category: "Form Creation" },
  { slug: "scheduling", title: "Form Scheduling & Limits", icon: Clock, category: "Form Creation" },
  { slug: "analytics", title: "Advanced Analytics", icon: BarChart3, category: "Insights" },
  { slug: "security", title: "Security & Data Isolation", icon: Shield, category: "Security & API" },
  { slug: "api-reference", title: "API Keys & Developer Tools", icon: Cpu, category: "Security & API" },
  { slug: "collaboration", title: "Teams & Collaboration", icon: Users, category: "Workspaces" },
];

const CONTENT: Record<string, DocContent> = {
  "form-builder": {
    title: "Interactive Form Builder",
    subtitle: "The most intuitive drag-and-drop experience for modern teams.",
    icon: Layout,
    color: "bg-blue-500",
    category: "Form Creation",
    description: "FormTo.Link's visual form builder allows you to construct complex, highly interactive forms in minutes. By eliminating technical overhead, your team can focus on capturing the right information from respondents with real-time preview and multiplayer co-editing.",
    features: [
      "Real-time visual drag-and-drop builder with handle reordering",
      "Over 24+ field types across Text, Choice, Rating/Scale, and Layout/Media",
      "Multipage sections with Next, Submit, and Success page configurations",
      "Rich text formatting for field labels, descriptions, and video embeds",
      "Live multiplayer co-editing with real-time cursor presence",
      "Field validation rules (min/max values, length, pattern regex, step numbers)"
    ],
    sections: [
      {
        heading: "Canvas & Drag-and-Drop Editor",
        paragraphs: [
          "To create a form, navigate to your FormTo.Link dashboard and click 'New Form'. You will be presented with a visual canvas and a field sidebar. Simply drag a field or click it to place it on your workspace.",
          "Every field can be repositioned using its handle or reordered via the Section Reorder dialog. An instant preview mode lets you view the respondent's exact viewport across mobile, tablet, and desktop viewports."
        ]
      },
      {
        heading: "24+ Field Types & Validation",
        paragraphs: [
          "We support 24 distinct question and layout types across four main categories: Text (Short, Long, Email, Phone, URL, Date, Time, DateTime), Choice (Select, Multi-Select, Checkbox, Radio, Radio Grid, Checkbox Grid, Ranking), Rating & Scale (Star Rating, Linear Scale 1-10, File Upload), and Layout/Media (Section, Page Break, Paragraph, Divider, Video Embed).",
          "Each field includes a property sidebar where you can customize labels, placeholders, guidelines, required flags, min/max values, character lengths, pattern regex matching, and step numbers."
        ]
      },
      {
        heading: "Sections, Publishing & Access Control",
        paragraphs: [
          "Group fields into logical sections configured as 'Next' (advances page), 'Submit' (submits form), or 'Success Page' (completion message). Customize form status (Draft, Active, Closed) and access controls.",
          "Configure settings like custom URL slug (/f/your-slug), primary accent color, response acceptance toggle, require authentication toggle, one response per user, submission capacity limits, and start/end scheduling."
        ],
        tips: [
          "Keep your forms under 8-10 fields per page to minimize friction and boost completion rates.",
          "Use input placeholders and detailed guidelines to ensure clean data entry.",
          "Preview your layout on a mobile screen representation to verify spacing and layout flow."
        ]
      }
    ],
    useCases: [
      { title: "Lead Capture Forms", desc: "Create compact intake forms with validation rules and clean completion redirects." },
      { title: "Multi-Step Surveys", desc: "Organize long questionnaires into multi-page sections with progress bar indicators." },
      { title: "Job Applications", desc: "Implement file upload inputs to securely collect candidate resumes and portfolios." }
    ],
    faq: [
      { q: "Can I duplicate an existing form?", a: "Yes. Select the options dropdown in your form list or within the builder header, and choose 'Duplicate' to copy all fields, configurations, and settings." },
      { q: "Is there a limit on fields or sections?", a: "We do not enforce a hard limit on form length, but for optimal loading times and respondent engagement, we suggest keeping forms under 35 fields." }
    ]
  },
  "logic-branching": {
    title: "Logic & Branching",
    subtitle: "Build intelligent forms that react dynamically to respondent choices.",
    icon: Puzzle,
    color: "bg-purple-500",
    category: "Logic & Rules",
    description: "Static questionnaires lead to drop-offs. FormTo.Link's visual logic engine evaluates respondent choices in real time, allowing you to show or hide fields, alter field states, populate values, skip sections, or trigger external redirects dynamically.",
    features: [
      "Visibility rules: Show or Hide fields conditionally",
      "Field state rules: Enable, Disable, Require, Unrequire, Mask, or Unmask inputs",
      "Value assignment: Set or copy field values automatically",
      "Smart navigation: Skip to page/section, scroll to field, or redirect to URL",
      "17 precision operators for text, numbers, dates, grids, and ranking fields",
      "Section Next/Submit button triggers (__nav_ triggers)",
      "Automated issue detection for circular loops & action conflicts"
    ],
    sections: [
      {
        heading: "Logical Actions & Categories",
        paragraphs: [
          "Logic rules in FormTo.Link are grouped into four operational categories: Visibility, State, Value, and Navigation. Each rule evaluates conditions instantly in the browser as respondents fill out your form.",
          "Visibility actions allow you to Show or Hide fields. State actions let you Enable/Disable inputs, Require/Unrequire fields dynamically, or Mask/Unmask sensitive fields (such as passcodes or identity numbers). Value actions allow setting static or copied values directly into target fields."
        ]
      },
      {
        heading: "Smart Navigation & Triggers",
        paragraphs: [
          "Navigation rules control how respondents advance through multi-page forms. You can configure rules to Skip to a specific Page or Section when respondents click Next, Scroll/Jump directly to a target field, or Redirect to an external web URL upon submission.",
          "Beyond field input triggers, FormTo.Link supports Navigation Button Triggers. You can attach logic rules directly to a section's Next or Submit button, evaluating conditions only when the respondent attempts to advance."
        ]
      },
      {
        heading: "17 Operators & Complex Condition Groups",
        paragraphs: [
          "Condition rules support 17 specialized operators tailored to exact field types. Text fields support 'contains', 'starts with', and 'ends with'. Numeric, rating, scale, and date fields support 'greater than', 'less than', '≥', '≤', and 'between' ranges.",
          "Specialized fields like Radio Grids, Checkbox Grids, and Ranking fields support matrix row/column matching and 'ranked higher/lower than' operators. Combine multiple conditions using AND/OR logic or nested condition groups."
        ],
        tips: [
          "Group related visibility rules into section-level skips to keep your rule builder clean.",
          "Use Navigation Triggers on Next buttons to validate multi-field responses before advancing.",
          "Check the logic issue detector for warnings about unreachable sections or conflicting rules."
        ]
      }
    ],
    useCases: [
      { title: "Dynamic Lead Qualification", desc: "Show enterprise inquiries only when respondents select company sizes over 100 employees." },
      { title: "Multi-Path Support Routing", desc: "Skip irrelevant pages and route respondents directly to billing or technical support sections." },
      { title: "Conditional Security Intake", desc: "Dynamically mask and require tax identification numbers when 'Business Entity' is selected." }
    ],
    faq: [
      { q: "What happens if two logic rules conflict?", a: "Rules are evaluated in sequential order. The builder includes an automated issue detector that flags mutually exclusive actions (e.g. Show vs Hide on the same field)." },
      { q: "Can I trigger logic on button clicks?", a: "Yes. Using Navigation Triggers, you can set rules that execute specifically when respondents click a section's Next or Submit button." }
    ]
  },
  "branding": {
    title: "Design & Customization",
    subtitle: "Make every form match your brand perfectly.",
    icon: Sparkles,
    color: "bg-pink-500",
    category: "Form Creation",
    description: "Your forms should represent your company. FormTo.Link provides intuitive design settings to customize primary accent colors, completion messages, progress bars, and submit redirects to align with your brand.",
    features: [
      "Custom brand accent color picker (#hex matching)",
      "Personalized completion success messages",
      "Automatic custom URL redirect on submission",
      "Visual progress bar toggle across pages",
      "Rich text formatting for titles and descriptions"
    ],
    sections: [
      {
        heading: "Accent Color Customization",
        paragraphs: [
          "Access design configurations directly inside the form settings. Enter your hex color code to align form buttons, active radio inputs, checkbox selections, rating stars, and progress indicators with your brand identity.",
          "The accent color updates instantly across the entire form UI in the live preview editor, ensuring consistent brand recognition for respondents on any device."
        ]
      },
      {
        heading: "Completion & Redirect Settings",
        paragraphs: [
          "Tailor the post-submission experience for your respondents. Define custom success message headings and detailed thank-you notes that display upon successful submission.",
          "Alternatively, configure a redirect URL to seamlessly forward respondents to your website landing page, booking calendar, or download portal as soon as they complete the form."
        ]
      },
      {
        heading: "Header & Layout Structure",
        paragraphs: [
          "Organize long questionnaires with section dividers, custom headings, and rich text descriptions. Toggle progress bar displays on or off to give respondents clear visual feedback on their completion status.",
          "Set a custom URL slug under form settings to make your form accessible at a clean link like 'formto.link/f/your-custom-slug'."
        ],
        tips: [
          "Choose high-contrast accent colors so buttons and selection states remain clearly readable.",
          "Use progress bars on multi-page forms to boost completion rates.",
          "Set up clear completion messages or redirects so respondents know their submission succeeded."
        ]
      }
    ],
    useCases: [
      { title: "Brand Surveys", desc: "Customize accent colors to match your website branding seamlessly." },
      { title: "Lead Generation Forms", desc: "Configure immediate completion redirects to forward qualified leads to your sales page." },
      { title: "Event RSVPs", desc: "Set friendly success messages confirming event details and ticket confirmation." }
    ],
    faq: [
      { q: "How do I change the form accent color?", a: "Go to your form settings panel, click on Accent Color, and choose a color preset or enter your custom hex code." },
      { q: "Can I redirect respondents to a custom URL?", a: "Yes. Enter your target web address in the Redirect URL field inside form settings to automatically forward users after submission." }
    ]
  },
  "scheduling": {
    title: "Form Scheduling & Limits",
    subtitle: "Automate form availability and control response capacity.",
    icon: Clock,
    color: "bg-emerald-500",
    category: "Form Creation",
    description: "Take control of your data collection pipeline. Set precise date and time windows for when your form opens and closes, enforce strict submission capacity limits, generate QR codes for instant link sharing, and configure automatic closure messages when limits are reached.",
    features: [
      "Scheduled start and end date/time windows",
      "Strict submission capacity limits with decremental counters",
      "One response per authenticated user restriction",
      "Custom URL slug & random suffix generator",
      "Built-in QR Code generator for print and digital sharing",
      "Custom out-of-capacity and closed form messages"
    ],
    sections: [
      {
        heading: "Submission Capacity Limits",
        paragraphs: [
          "Set a maximum limit on total accepted responses to manage capacity for events, limited signups, or beta programs. As respondents submit data, FormTo.Link automatically decrements the remaining count.",
          "When the maximum response threshold is hit, your form status switches to closed automatically, preventing further submissions while displaying your custom out-of-capacity message to visitors."
        ]
      },
      {
        heading: "Date & Time Scheduling",
        paragraphs: [
          "Schedule forms to open and close automatically at specific dates and times. This is ideal for time-sensitive surveys, grant applications, or promotional registration windows.",
          "Optionally display a countdown timer or opening schedule badge directly on the form landing page so respondents know exactly when submissions begin or end."
        ]
      },
      {
        heading: "QR Code Sharing & Access Control",
        paragraphs: [
          "Generate instant QR codes directly from your form settings panel. Download vector or image QR codes to print on posters, flyers, business cards, or event badges for friction-free mobile scanning.",
          "Toggle whether responses are open to the general public or restricted to authenticated workspace accounts. Enable one-response-per-user mode to prevent duplicate entries from the same respondent."
        ],
        tips: [
          "Download high-resolution QR codes from form settings for print materials.",
          "Set submission limits before sharing your form link publicly to prevent over-subscription.",
          "Configure custom closing messages to direct late respondents to alternative resources or support."
        ]
      }
    ],
    useCases: [
      { title: "Event Registration", desc: "Cap RSVPs at 100 attendees and share QR codes on event banners for instant mobile check-ins." },
      { title: "Time-Bound Applications", desc: "Schedule grant or contest entry forms to open on Monday at 9 AM and close Friday at 5 PM." },
      { title: "Exclusive Surveys", desc: "Require user authentication and limit to one submission per account to ensure authentic feedback." }
    ],
    faq: [
      { q: "What happens when a form reaches its submission limit?", a: "The form automatically stops accepting submissions and shows your custom closing message. You can reopen it anytime by increasing the limit or toggling response acceptance." },
      { q: "Can I generate a QR code for my form?", a: "Yes. Click on Form Settings to view and download your form's custom QR code image for print or digital sharing." }
    ]
  },
  "analytics": {
    title: "Advanced Analytics",
    subtitle: "Transform raw submissions into clear insight charts.",
    icon: BarChart3,
    color: "bg-emerald-500",
    category: "Insights",
    description: "Data collection is only half the battle. FormTo.Link's analytics engine processes submissions instantly, rendering detailed performance indicators, daily volume trend lines, and multi-format data exports in real time.",
    features: [
      "Daily submission volume trend line chart (30-day history)",
      "Average completion time tracking per response",
      "Choice-distribution bar charts and percentage progress bars",
      "Rating & scale distribution charts with statistical averages",
      "Individual response inspector sheet with signed file download links",
      "Multi-format exports to CSV, Excel (XLSX), and PDF reports"
    ],
    sections: [
      {
        heading: "Performance Dashboards",
        paragraphs: [
          "Our dashboard gives you an instant overview of your form's health. Monitor views, unique visitors, total submissions, and conversion metrics. A 30-day trend line highlights spikes in respondent activity.",
          "All calculations are processed on-demand using Recharts visualization, updating immediately as submissions land. Timezone localization automatically formats submission timestamps based on your browser locale."
        ]
      },
      {
        heading: "Question Breakdown & Text Metrics",
        paragraphs: [
          "Every choice-based question (dropdown, radio button, checklist, grids) gets its own visualization block, rendering frequency summaries and percentage progress bars automatically.",
          "Rating stars and linear scales render distribution bar charts with computed statistical averages. Text fields display total response counts and average character length metrics."
        ]
      },
      {
        heading: "Data Portability & Multi-Format Exports",
        paragraphs: [
          "Your data is yours. Inspect individual responses using the side sheet drawer, complete with signed Supabase download links for file attachments.",
          "Export response tables in one click: generate raw CSV files for data pipelines, formatted Excel spreadsheets (.xlsx) via sheetjs, or formatted PDF tables via jsPDF for executive summary reporting."
        ],
        tips: [
          "Use the response search bar to filter entries by email or specific text answers.",
          "Export responses to PDF for printable executive reports or offline archival.",
          "Check average completion times to optimize form length and section pacing."
        ]
      }
    ],
    useCases: [
      { title: "Campaign Tracking", desc: "Analyze daily submission trend lines to measure the success of email newsletters or social ads." },
      { title: "Customer Assessment", desc: "Track customer satisfaction levels via aggregated scale rating distribution charts over time." },
      { title: "Executive Reporting", desc: "Export structured CSV, Excel (XLSX), or PDF report tables directly into tools for presentation." }
    ],
    faq: [
      { q: "What export formats are supported?", a: "FormTo.Link supports exporting responses directly to CSV, Excel (.xlsx), and PDF document formats from the Results tab." },
      { q: "How are uploaded file attachments accessed?", a: "File upload answers in the response inspector generate secure, time-limited signed URLs for downloading attachments." }
    ]
  },
  "security": {
    title: "Security & Compliance",
    subtitle: "Enterprise-grade data protection by default.",
    icon: Shield,
    color: "bg-amber-600",
    category: "Security & API",
    description: "We treat security as a core foundation. Every submission, asset, and key is stored with robust security measures to guarantee that data remains private and protected at all times.",
    features: [
      "Secure Supabase-managed storage infrastructure",
      "Row-Level Security (RLS) database isolation",
      "JWT-based sessions and security verification",
      "Hashed IP addresses to prevent identity leaks",
      "GDPR, CCPA, and privacy regulation compliance"
    ],
    sections: [
      {
        heading: "Data Privacy & Isolation",
        paragraphs: [
          "All data is housed in isolated Postgres databases inside Supabase, guarded by strict Row-Level Security (RLS) rules. This guarantees that team members can only access records they have explicit roles to view.",
          "Submission transfers are encrypted using TLS 1.3, and all databases are encrypted at rest with AES-256 keys. We conduct weekly automated dependency audits and fix vulnerabilities within 24 hours."
        ]
      },
      {
        heading: "IP Anonymization",
        paragraphs: [
          "To align with global privacy mandates like GDPR and CCPA, FormTo.Link does not store plain IP addresses. Instead, we hash the IP addresses on our server using cryptographic algorithms.",
          "This supports anti-spam mechanisms and helps identify duplicate entries while protecting the respondent's personal identity. You can collect data globally without violating privacy laws."
        ]
      },
      {
        heading: "Access Control & Audits",
        paragraphs: [
          "Workspace collaboration is isolated at the database level. Every action—from form changes to API requests—requires a valid JWT token. You can configure multi-factor auth (MFA) to lock down manager access.",
          "We maintain audit records containing action prefixes and timestamps. This ensures security administrators can verify access and trace configuration changes across the platform."
        ],
        tips: [
          "Enable two-factor authentication (2FA) for all team members in your account settings.",
          "Set up short-lived organization invitation links to prevent unauthorized workspace access.",
          "Review your form settings to ensure you are only collecting personal data that is necessary for your goals."
        ]
      }
    ],
    useCases: [
      { title: "HR Feedback Surveys", desc: "Gather employee reviews with peace of mind knowing results are restricted to verified admins." },
      { title: "Customer Registration", desc: "Collect signups and contact info via forms compliant with strict European privacy rules." },
      { title: "Financial Client Intake", desc: "Obtain document uploads securely stored in access-restricted cloud storage buckets." }
    ],
    faq: [
      { q: "Is my uploaded file data secure?", a: "Yes. All uploaded documents are stored in secure buckets. Download links are short-lived and expire after a configurable duration to prevent leaks." },
      { q: "Can I request a data deletion audit?", a: "Yes. Administrators can trigger a complete deletion request for any form or response, purging all matching records from our backups within 72 hours." }
    ]
  },
  "api-reference": {
    title: "API & Developer Tools",
    subtitle: "Extend and integrate FormTo.Link into your application stack.",
    icon: Cpu,
    color: "bg-red-500",
    category: "Security & API",
    description: "FormTo.Link is built with developers in mind. Our REST API allows you to programmatically manage forms, extract response arrays, and manage keys to automate your workflows.",
    features: [
      "RESTful HTTP API endpoints with JSON payloads",
      "Secure hashed API key authentication",
      "Usage stats and last-used tracking",
      "Granular read/write endpoint scopes",
      "Detailed code examples (cURL, Javascript, Python)"
    ],
    sections: [
      {
        heading: "Authentication",
        paragraphs: [
          "To make API requests, you must generate a token under your organization's settings. Include the key as a Bearer token in your HTTP requests: `Authorization: Bearer ftl_live_...`.",
          "We store only the cryptographic hash of your key, never the plain token. The full key is displayed only once upon generation. Keep your tokens safe and never expose them in client-side code."
        ]
      },
      {
        heading: "Endpoints Overview",
        paragraphs: [
          "Our API exposes paths to retrieve form lists, fetch detailed schemas, and download response rows. You can filter response records by creation date, completion status, or respondent email.",
          "All query results are paginated via limit and offset query parameters. Our JSON structure maps directly to our database schema, making it easy to sync records with your internal systems."
        ]
      },
      {
        heading: "Rate Limits & Errors",
        paragraphs: [
          "To maintain system stability, we enforce rate limits based on your subscription tier. Team accounts allow up to 1,000 API requests per hour, while Pro accounts allow 200.",
          "Exceeding limits returns a `429 Too Many Requests` status with a `Retry-After` header. Standard HTTP error codes apply: `400` for malformed JSON, `401` for invalid keys, and `403` for forbidden resources."
        ],
        tips: [
          "Implement exponential backoff logic in your scripts to handle rate-limit limits gracefully.",
          "Use separate API keys for development, staging, and production environments.",
          "Never commit API keys to public repositories; load them using environment variables."
        ]
      }
    ],
    useCases: [
      { title: "CRM Syncing Pipelines", desc: "Import new form responses into internal databases or customer management pipelines via cron jobs." },
      { title: "Automated Data Backups", desc: "Download full CSV or JSON outputs of daily forms to an offline storage server every night." },
      { title: "Custom Admin Panels", desc: "Fetch response arrays programmatically to build internal analytics dashboards for your team." }
    ],
    faq: [
      { q: "Can I restrict API keys?", a: "Yes. You can generate keys with read-only scopes if you only need to fetch response records, minimizing potential security risks." },
      { q: "Do you support GraphQL?", a: "Our current API is REST-only. We are evaluating GraphQL support and will announce updates on our developer blog." }
    ]
  },
  "collaboration": {
    title: "Teams & Collaboration",
    subtitle: "Work together in real-time with multiplayer editing and organization controls.",
    icon: Users,
    color: "bg-indigo-500",
    category: "Workspaces",
    description: "Building forms is a team effort. FormTo.Link features real-time multiplayer co-editing, structured organization workspaces, resource quota monitoring, and 5-tier role permissions to help your team collaborate seamlessly.",
    features: [
      "Real-time multiplayer editing powered by Liveblocks",
      "Live presence indicators, avatar stacks, and cursor tracking",
      "Multiplayer Undo/Redo history stack across editors",
      "Shared organization workspaces for forms, assets, and API keys",
      "Five granular role permissions (Owner, Manager, Administrator, Editor, Viewer)",
      "Resource quota monitoring (Member limits, Form limits, Storage limits)",
      "Secure invite links with email verification tokens (48h expiry)"
    ],
    sections: [
      {
        heading: "Multiplayer Visual Editor & Live Presence",
        paragraphs: [
          "Our form builder uses Liveblocks to sync visual updates across editors in real time. Multiple team members can work on the same form canvas simultaneously, viewing each other's active field selections and cursor movements.",
          "Changes to field labels, options, section breaks, or logic rules are broadcast instantly. The engine includes multiplayer Undo and Redo history stacks, resolving concurrent edit conflicts automatically."
        ]
      },
      {
        heading: "Organization Workspaces & Resource Quotas",
        paragraphs: [
          "Organization workspaces centralize form assets, uploaded media, and API keys. Moving forms into shared organization workspaces ensures project ownership remains with your company if a team member leaves.",
          "The organization panel tracks real-time resource quotas: Member Usage vs Member Limit, Form Usage vs Form Limit, Storage Usage (MB/GB) vs Storage Limit, and Monthly Submission Caps."
        ]
      },
      {
        heading: "Role Permissions & Token Invites",
        paragraphs: [
          "Manage team access with five distinct roles: Owner, Manager, Administrator, Editor, and Viewer. Owners hold master billing access and ownership transfer rights. Managers invite team members and adjust role assignments.",
          "Administrators manage API keys and workspace templates, Editors create and modify forms and logic, while Viewers hold read-only access to response tables and analytics. Invites send secure tokens expiring after 48 hours."
        ],
        tips: [
          "Assign Viewer roles to clients or stakeholders who only need to read response charts.",
          "Monitor organization storage and member limits from the Organization Settings tab.",
          "Use live presence cursors to coordinate edits during real-time design sessions."
        ]
      }
    ],
    useCases: [
      { title: "Cross-Team Alignment", desc: "Allow marketing copywriters and developers to edit form text and validation rules together." },
      { title: "Agency Client Reporting", desc: "Invite clients as Viewers so they can monitor submission charts in real time." },
      { title: "Corporate Operations", desc: "Create isolated workspaces for HR, Sales, and Support teams to manage separate feedback loops." }
    ],
    faq: [
      { q: "How do I invite team members?", a: "Go to Organization Settings, enter their email, and select their role (Owner to Viewer). They will receive a secure invite link to join your workspace." },
      { q: "Are invite links secure?", a: "Yes. Invite links contain unique cryptographic tokens that expire after 48 hours. They can only be claimed by the target email address." },
      { q: "Can organization ownership be transferred?", a: "Yes. The current Organization Owner can transfer primary ownership to another verified member from the Organization Settings panel." }
    ]
  }
};

export default function FeatureDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const content = CONTENT[slug as keyof typeof CONTENT];

  const currentNavIndex = DOC_NAVIGATION.findIndex((item) => item.slug === slug);
  const prevDoc = currentNavIndex > 0 ? DOC_NAVIGATION[currentNavIndex - 1] : null;
  const nextDoc = currentNavIndex < DOC_NAVIGATION.length - 1 ? DOC_NAVIGATION[currentNavIndex + 1] : null;

  if (!content) {
    return (
      <div className="container py-32 text-center max-w-xl mx-auto">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-3">Document Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find the documentation guide you're looking for.</p>
        <Button onClick={() => router.push("/resources")} className="rounded-xl">
          Back to Documentation Hub
        </Button>
      </div>
    );
  }

  const TopicIcon = content.icon;

  return (
    <div className="flex flex-col w-full min-h-screen bg-background text-foreground">
      {/* ─── Top Breadcrumbs Bar ─────────────────────────────────────────── */}
      <div className="border-b border-border/60 bg-muted/20 py-3">
        <div className="container px-4 md:px-6 mx-auto max-w-7xl flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground overflow-x-auto scrollbar-none">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Link href="/resources" className="hover:text-foreground transition-colors">Documentation</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-muted-foreground font-medium">{content.category}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-foreground font-semibold truncate">{content.title}</span>
          </nav>

          <Link href="/resources">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" />
              All Topics
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── 3-Column Documentation Layout ───────────────────────────────── */}
      <div className="container px-4 md:px-6 mx-auto max-w-7xl py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* ─── Left Sidebar Navigation (3 cols) ─────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-6">
            <div className="p-4 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  Documentation Hub
                </span>
                <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                  v1.0
                </span>
              </div>

              <div className="space-y-1">
                {DOC_NAVIGATION.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.slug === slug;
                  return (
                    <Link
                      key={item.slug}
                      href={`/resources/${item.slug}`}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Support Callout Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-muted/30 to-background border border-primary/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Need API Support?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contact our support engineering team for custom integration advice or workspace migrations.
              </p>
              <Link href="/contact" className="block">
                <Button size="sm" variant="outline" className="w-full h-8 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 rounded-lg">
                  Ask Support
                </Button>
              </Link>
            </div>
          </aside>

          {/* ─── Center Article Content (9 cols on lg, 6 cols on xl) ─────── */}
          <main className="lg:col-span-9 xl:col-span-6 space-y-12">
            
            {/* Header Header */}
            <div className="space-y-6 pb-8 border-b border-border/80">
              <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-2xl text-white shadow-md", content.color)}>
                  <TopicIcon className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {content.category} Guide
                  </span>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1">
                    {content.title}
                  </h1>
                </div>
              </div>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {content.subtitle}
              </p>

              {/* Quick Capabilities Box */}
              <div className="p-6 rounded-2xl border border-border bg-card/80 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary" />
                  Key Capabilities in this Guide
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {content.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs md:text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overview Section */}
            <section id="overview" className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {content.description}
              </p>
            </section>

            {/* Detailed Sections */}
            <div className="space-y-12">
              {content.sections.map((section, idx) => (
                <section
                  key={section.heading}
                  id={`section-${idx}`}
                  className="space-y-5 pt-4"
                >
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight border-b border-border/60 pb-3">
                    {section.heading}
                  </h2>
                  <div className="space-y-4">
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="text-base text-muted-foreground leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>

                  {section.tips && (
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                        <Lightbulb className="h-4 w-4" />
                        <span>Pro Tips & Best Practices</span>
                      </div>
                      <ul className="space-y-2">
                        {section.tips.map((tip, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2 text-xs md:text-sm text-amber-950 dark:text-amber-200">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* Use Cases */}
            <section id="use-cases" className="space-y-6 pt-6">
              <h2 className="text-2xl font-bold tracking-tight">Real-World Use Cases</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {content.useCases.map((uc, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-sm">
                    <h3 className="font-bold text-sm text-foreground">{uc.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{uc.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Frequently Asked Questions */}
            <section id="faq" className="space-y-6 pt-6">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-primary" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {content.faq.map((item, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-muted/30 border border-border space-y-2">
                    <h3 className="font-semibold text-sm md:text-base text-foreground">{item.q}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Next / Prev Navigation Bar */}
            <div className="pt-10 border-t border-border flex items-center justify-between gap-4">
              {prevDoc ? (
                <Link href={`/resources/${prevDoc.slug}`} className="group flex-1">
                  <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Previous</span>
                    <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1 mt-1">
                      <ChevronLeft className="h-4 w-4 shrink-0" />
                      <span className="truncate">{prevDoc.title}</span>
                    </div>
                  </div>
                </Link>
              ) : <div />}

              {nextDoc && (
                <Link href={`/resources/${nextDoc.slug}`} className="group flex-1 text-right">
                  <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Next Topic</span>
                    <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-end gap-1 mt-1">
                      <span className="truncate">{nextDoc.title}</span>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </main>

          {/* ─── Right Sidebar (On This Page Table of Contents) (3 cols) ─── */}
          <aside className="hidden xl:block xl:col-span-3 sticky top-24 space-y-6">
            <div className="p-5 rounded-2xl border border-border/80 bg-card/40 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                On This Page
              </span>

              <nav className="space-y-2 text-xs">
                <a href="#overview" className="block text-muted-foreground hover:text-primary transition-colors">
                  • Overview
                </a>
                {content.sections.map((sec, i) => (
                  <a
                    key={i}
                    href={`#section-${i}`}
                    className="block text-muted-foreground hover:text-primary transition-colors truncate"
                  >
                    • {sec.heading}
                  </a>
                ))}
                <a href="#use-cases" className="block text-muted-foreground hover:text-primary transition-colors">
                  • Real-World Use Cases
                </a>
                <a href="#faq" className="block text-muted-foreground hover:text-primary transition-colors">
                  • Frequently Asked Questions
                </a>
              </nav>
            </div>

            {/* Quick Actions Card */}
            <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Quick Actions
              </span>
              <div className="space-y-2">
                <Link href="/login" className="block">
                  <Button size="sm" className="w-full h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
                    Try in Form Builder
                  </Button>
                </Link>
                <Link href="/resources" className="block">
                  <Button size="sm" variant="ghost" className="w-full h-9 text-xs font-semibold text-muted-foreground hover:text-foreground">
                    View All Docs
                  </Button>
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
