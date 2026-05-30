import { PrismaClient, ApplicationStatus, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@momentum.app",
  name: "Demo Builder",
  dailyGoal: 5,
  timezone: "America/Los_Angeles",
};

const COMPANIES = [
  "Apple", "Stripe", "Linear", "Vercel", "Anthropic", "OpenAI", "Figma", "Notion",
  "Airbnb", "Datadog", "Shopify", "Coinbase", "Discord", "Asana", "Cloudflare",
  "Ramp", "Plaid", "Brex", "Retool", "Mercury", "Arc", "Replit", "Substack",
  "Loom", "Webflow", "Framer", "Zapier", "GitHub", "GitLab", "Atlassian",
];

const ROLES = [
  "Software Engineer", "Senior Software Engineer", "Frontend Engineer",
  "Full-Stack Engineer", "Product Engineer", "Platform Engineer",
  "Infrastructure Engineer", "AI Engineer", "ML Engineer",
  "Senior Frontend Engineer", "Staff Engineer", "Engineering Manager",
];

const LOCATIONS = [
  "San Francisco, CA", "New York, NY", "Remote", "Seattle, WA",
  "Austin, TX", "Boston, MA", "London, UK", "Toronto, ON",
];

const STATUSES: ApplicationStatus[] = [
  "APPLIED", "APPLIED", "APPLIED", "APPLIED", "APPLIED",
  "OA", "OA",
  "RECRUITER_SCREEN", "RECRUITER_SCREEN",
  "INTERVIEW", "INTERVIEW",
  "FINAL_ROUND",
  "OFFER",
  "REJECTED", "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
];

const SALARIES = ["$140k-$180k", "$160k-$200k", "$180k-$240k", "$200k-$280k", null, null];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

async function main() {
  console.log("Seeding demo user…");

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {
      name: DEMO_USER.name,
      dailyGoal: DEMO_USER.dailyGoal,
      timezone: DEMO_USER.timezone,
    },
    create: DEMO_USER,
  });

  // Wipe existing demo data so seed is idempotent.
  await prisma.application.deleteMany({ where: { userId: user.id } });

  const today = startOfDay(new Date());
  const applications: Prisma.ApplicationCreateManyInput[] = [];
  const eventsByAppIndex: { status: ApplicationStatus; daysAfter: number; note?: string }[][] = [];

  // Build 90 days of activity with a believable rhythm:
  //  - some empty days (rest)
  //  - bursts of 3-7 apps on focused days
  //  - mostly 1-3 per day
  const TOTAL_DAYS = 90;
  let appIndex = 0;
  for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dow = date.getDay(); // 0 sun … 6 sat
    const weekend = dow === 0 || dow === 6;
    const r = Math.random();

    let count: number;
    if (weekend) count = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
    else if (r < 0.08) count = 0;          // rest days
    else if (r < 0.18) count = 6 + Math.floor(Math.random() * 3); // burst
    else count = 1 + Math.floor(Math.random() * 4);

    for (let k = 0; k < count; k++) {
      const status = pick(STATUSES);
      const company = pick(COMPANIES);
      const role = pick(ROLES);

      const appliedAt = new Date(date);
      appliedAt.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

      applications.push({
        id: `seed_${appIndex.toString(36)}_${appliedAt.getTime()}`,
        userId: user.id,
        company,
        role,
        location: pick(LOCATIONS),
        jobLink: `https://jobs.example.com/${company.toLowerCase()}/${appIndex}`,
        applicationDate: appliedAt,
        status,
        salary: pick(SALARIES),
        recruiter: Math.random() < 0.4 ? pick(["Alex Kim", "Jordan Patel", "Riley Chen", "Sam Park"]) : null,
        referral: Math.random() < 0.18 ? pick(["Internal referral", "Friend on team", "Conference contact"]) : null,
        notes: Math.random() < 0.35 ? "Great team alignment, follow up next week." : null,
        followUpDate: Math.random() < 0.25 ? new Date(appliedAt.getTime() + 7 * 86_400_000) : null,
        responseReceived: status !== "APPLIED" && status !== "GHOSTED",
        interviewStage:
          status === "INTERVIEW" ? "Technical round 1"
          : status === "FINAL_ROUND" ? "Onsite"
          : null,
        offerStatus: status === "OFFER" ? "Pending decision" : null,
      });

      // Build status history events that lead up to the current state.
      const ladder: ApplicationStatus[] = [
        "APPLIED",
        "RECRUITER_SCREEN",
        "INTERVIEW",
        "FINAL_ROUND",
        "OFFER",
      ];
      const ladderIdx = ladder.indexOf(status);
      const events: { status: ApplicationStatus; daysAfter: number; note?: string }[] = [
        { status: "APPLIED", daysAfter: 0 },
      ];
      if (ladderIdx > 0) {
        for (let s = 1; s <= ladderIdx; s++) {
          events.push({ status: ladder[s]!, daysAfter: s * 4 + Math.floor(Math.random() * 3) });
        }
      } else if (status === "OA") {
        events.push({ status: "OA", daysAfter: 2 });
      } else if (status === "REJECTED") {
        events.push({ status: "REJECTED", daysAfter: 5 + Math.floor(Math.random() * 10) });
      } else if (status === "WITHDRAWN") {
        events.push({ status: "WITHDRAWN", daysAfter: 3 });
      }
      eventsByAppIndex.push(events);
      appIndex++;
    }
  }

  console.log(`Inserting ${applications.length} applications…`);
  await prisma.application.createMany({ data: applications });

  console.log("Building status events…");
  const eventRows: Prisma.StatusEventCreateManyInput[] = [];
  applications.forEach((app, i) => {
    const events = eventsByAppIndex[i]!;
    for (const e of events) {
      const occurredAt = new Date(app.applicationDate as Date);
      occurredAt.setDate(occurredAt.getDate() + e.daysAfter);
      eventRows.push({
        applicationId: app.id!,
        status: e.status,
        occurredAt,
        note: e.note,
      });
    }
  });
  await prisma.statusEvent.createMany({ data: eventRows });

  // A handful of curated tags
  const tagDefs = [
    { name: "Dream", color: "#f59e0b" },
    { name: "Reach", color: "#a855f7" },
    { name: "Backup", color: "#64748b" },
    { name: "Referred", color: "#10b981" },
  ];
  for (const t of tagDefs) {
    await prisma.tag.upsert({
      where: { userId_name: { userId: user.id, name: t.name } },
      update: { color: t.color },
      create: { userId: user.id, name: t.name, color: t.color },
    });
  }

  console.log(`Done. User ${user.email} now has ${applications.length} applications.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
