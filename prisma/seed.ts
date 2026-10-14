/**
 * Demo data: one agency with a team, three clients, projects, deliverables
 * (with real files on disk) and a year of invoices.
 *
 *   npm run db:seed
 *
 * Logins (password for all: "password123"):
 *   owner@northwind.test   agency owner
 *   sam@northwind.test     team member
 *   jordan@acme.test       client (Acme Inc.)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type DeliverableStatus, type ProjectStatus } from "@prisma/client";

const db = new PrismaClient();
const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
const DAY = 86_400_000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

async function main() {
  const existing = await db.user.findUnique({ where: { email: "owner@northwind.test" } });
  if (existing) {
    console.log("Demo data already present — skipping. (Reset with: npx prisma migrate reset)");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  const [owner, sam, jordan, priya, lee] = await Promise.all(
    [
      ["Alex Morgan", "owner@northwind.test"],
      ["Sam Rivera", "sam@northwind.test"],
      ["Jordan Lee", "jordan@acme.test"],
      ["Priya Shah", "priya@bluepeak.test"],
      ["Lee Chen", "lee@harbor.test"],
    ].map(([name, email]) => db.user.create({ data: { name: name!, email: email!, passwordHash } })),
  );

  const agency = await db.agency.create({ data: { name: "Northwind Studio", currency: "usd", invoicePrefix: "NW" } });
  const [acme, bluepeak, harbor] = await Promise.all([
    db.client.create({ data: { agencyId: agency.id, name: "Acme Inc.", email: "billing@acme.test", website: "acme.test" } }),
    db.client.create({ data: { agencyId: agency.id, name: "Bluepeak Outdoors", email: "accounts@bluepeak.test" } }),
    db.client.create({ data: { agencyId: agency.id, name: "Harbor Coffee Co.", email: "hello@harbor.test" } }),
  ]);

  await db.membership.createMany({
    data: [
      { userId: owner!.id, agencyId: agency.id, role: "OWNER" },
      { userId: sam!.id, agencyId: agency.id, role: "MEMBER" },
      { userId: jordan!.id, agencyId: agency.id, role: "CLIENT", clientId: acme.id },
      { userId: priya!.id, agencyId: agency.id, role: "CLIENT", clientId: bluepeak.id },
      { userId: lee!.id, agencyId: agency.id, role: "CLIENT", clientId: harbor.id },
    ],
  });

  type Seed = {
    client: typeof acme;
    name: string;
    description: string;
    status: ProjectStatus;
    start: number;
    due: number;
    deliverables: { title: string; description?: string; status: DeliverableStatus; age: number; files: string[]; note?: string; reviewer?: typeof jordan }[];
  };

  const projects: Seed[] = [
    {
      client: acme,
      name: "Website redesign",
      description: "New marketing site: information architecture, visual design and a component library handed off to Acme's developers.",
      status: "IN_REVIEW",
      start: 60,
      due: -21,
      deliverables: [
        { title: "Sitemap & wireframes", status: "APPROVED", age: 40, files: ["sitemap.pdf", "wireframes-v2.pdf"], reviewer: jordan, note: "Looks great — approved." },
        { title: "Homepage visual design", description: "Two directions for the homepage. Let us know which one you prefer!", status: "PENDING_REVIEW", age: 2, files: ["homepage-direction-a.png", "homepage-direction-b.png"] },
        { title: "Interior page templates", status: "CHANGES_REQUESTED", age: 6, files: ["templates.pdf"], reviewer: jordan, note: "Can we make the pricing table more prominent?" },
      ],
    },
    {
      client: acme,
      name: "Brand guidelines",
      description: "A concise brand book covering logo usage, color, typography and tone of voice.",
      status: "COMPLETED",
      start: 150,
      due: 95,
      deliverables: [{ title: "Brand book v1.0", status: "APPROVED", age: 100, files: ["acme-brand-book.pdf"], reviewer: jordan }],
    },
    {
      client: bluepeak,
      name: "Spring campaign",
      description: "Creative for the spring product launch across social, email and paid.",
      status: "IN_PROGRESS",
      start: 20,
      due: -30,
      deliverables: [{ title: "Campaign concepts", status: "PENDING_REVIEW", age: 1, files: ["concepts.pdf"] }],
    },
    { client: bluepeak, name: "E-commerce photography", description: "Product photography for 40 SKUs.", status: "PLANNING", start: -7, due: -45, deliverables: [] },
    {
      client: harbor,
      name: "Packaging refresh",
      description: "Updated bag and cup designs for the new seasonal line.",
      status: "ON_HOLD",
      start: 45,
      due: -10,
      deliverables: [{ title: "Bag dielines", status: "APPROVED", age: 30, files: ["dielines.pdf"], reviewer: lee }],
    },
  ];

  const created: Record<string, string> = {};
  for (const p of projects) {
    const project = await db.project.create({
      data: {
        agencyId: agency.id,
        clientId: p.client.id,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: utcDay(daysAgo(p.start)),
        dueDate: utcDay(daysAgo(p.due)),
        createdById: owner!.id,
        createdAt: daysAgo(Math.max(p.start, 0)),
      },
    });
    created[p.name] = project.id;
    await db.activity.create({
      data: { agencyId: agency.id, clientId: p.client.id, projectId: project.id, actorId: owner!.id, message: `Alex Morgan started project ${p.name}`, href: `/projects/${project.id}`, createdAt: daysAgo(Math.max(p.start, 0)) },
    });

    for (const d of p.deliverables) {
      const reviewed = d.status !== "PENDING_REVIEW";
      const deliverable = await db.deliverable.create({
        data: {
          projectId: project.id,
          title: d.title,
          description: d.description,
          status: d.status,
          createdById: d.age % 2 ? sam!.id : owner!.id,
          createdAt: daysAgo(d.age),
          reviewNote: reviewed ? (d.note ?? null) : null,
          reviewedById: reviewed ? d.reviewer!.id : null,
          reviewedAt: reviewed ? daysAgo(Math.max(0, d.age - 1)) : null,
        },
      });
      for (const name of d.files) {
        const storageKey = `${agency.id}/${deliverable.id}/${randomUUID()}`;
        const body = `Demo file "${name}" for ${p.client.name} — ${p.name}.\n`;
        await mkdir(path.join(uploadRoot, path.dirname(storageKey)), { recursive: true });
        await writeFile(path.join(uploadRoot, storageKey), body);
        await db.file.create({
          data: {
            deliverableId: deliverable.id,
            name,
            size: Buffer.byteLength(body),
            mimeType: "text/plain",
            storageKey,
            uploadedById: deliverable.createdById,
            createdAt: daysAgo(d.age),
          },
        });
      }
      await db.activity.create({
        data: {
          agencyId: agency.id,
          clientId: p.client.id,
          projectId: project.id,
          actorId: deliverable.createdById,
          message: `${deliverable.createdById === owner!.id ? "Alex Morgan" : "Sam Rivera"} shared “${d.title}” for review`,
          href: `/projects/${project.id}`,
          createdAt: daysAgo(d.age),
        },
      });
      if (reviewed) {
        await db.activity.create({
          data: {
            agencyId: agency.id,
            clientId: p.client.id,
            projectId: project.id,
            actorId: d.reviewer!.id,
            message: `${d.reviewer!.name} ${d.status === "APPROVED" ? "approved" : "requested changes on"} “${d.title}”`,
            href: `/projects/${project.id}`,
            createdAt: daysAgo(Math.max(0, d.age - 1)),
          },
        });
      }
    }
  }

  // A year of invoices: mostly paid, a few open, one overdue, one draft.
  const clients = [acme, bluepeak, harbor];
  const services = [
    ["Design sprint", 4, 1800_00],
    ["Development retainer", 1, 4500_00],
    ["Art direction (hours)", 12, 150_00],
    ["Copywriting", 1, 1200_00],
    ["Photography day rate", 2, 1400_00],
  ] as const;
  let number = 1001;
  for (let m = 11; m >= 0; m--) {
    const perMonth = 2 + ((m * 7) % 3);
    for (let k = 0; k < perMonth; k++) {
      const client = clients[(m + k) % clients.length]!;
      const [desc, qty, unit] = services[(m * 3 + k) % services.length]!;
      const scale = 0.7 + ((m * 13 + k * 5) % 10) / 10;
      const unitAmount = Math.round((unit * scale) / 100) * 100;
      const amount = qty * unitAmount;
      const issue = utcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 3 + k * 6)));
      if (issue > now) continue;
      const due = new Date(issue.getTime() + 14 * DAY);
      const isRecent = m === 0;
      const status = isRecent && k > 0 ? "OPEN" : "PAID";
      const paidAt = status === "PAID" ? new Date(Math.min(issue.getTime() + (5 + k * 3) * DAY, now.getTime() - DAY)) : null;
      const projectId = client.id === acme.id ? created["Website redesign"] : client.id === bluepeak.id ? created["Spring campaign"] : created["Packaging refresh"];
      const invoice = await db.invoice.create({
        data: {
          agencyId: agency.id,
          clientId: client.id,
          projectId,
          number: `NW-${number++}`,
          status,
          currency: "usd",
          issueDate: issue,
          dueDate: due,
          subtotal: amount,
          total: amount,
          sentAt: issue,
          paidAt,
          paymentMethod: paidAt ? (k % 2 ? "bank_transfer" : "stripe") : null,
          createdById: owner!.id,
          createdAt: issue,
          items: { create: [{ description: desc, quantity: qty, unitAmount, amount, position: 0 }] },
        },
      });
      if (paidAt) {
        await db.activity.create({
          data: { agencyId: agency.id, clientId: client.id, actorId: null, message: `${client.name} paid invoice ${invoice.number}`, href: `/invoices/${invoice.id}`, createdAt: paidAt },
        });
      }
    }
  }

  // One overdue and one draft.
  await db.invoice.create({
    data: {
      agencyId: agency.id,
      clientId: harbor.id,
      projectId: created["Packaging refresh"],
      number: `NW-${number++}`,
      status: "OPEN",
      currency: "usd",
      issueDate: utcDay(daysAgo(40)),
      dueDate: utcDay(daysAgo(10)),
      subtotal: 2400_00,
      taxRate: 825,
      tax: 198_00,
      total: 2598_00,
      sentAt: daysAgo(40),
      createdById: owner!.id,
      notes: "Payment by bank transfer: Northwind Studio LLC · Acct 000123456 · Routing 110000000",
      items: { create: [{ description: "Packaging design — phase 1", quantity: 1, unitAmount: 2400_00, amount: 2400_00, position: 0 }] },
    },
  });
  await db.invoice.create({
    data: {
      agencyId: agency.id,
      clientId: bluepeak.id,
      projectId: created["Spring campaign"],
      number: `NW-${number++}`,
      status: "DRAFT",
      currency: "usd",
      issueDate: utcDay(now),
      dueDate: utcDay(new Date(now.getTime() + 14 * DAY)),
      subtotal: 6000_00,
      total: 6000_00,
      createdById: owner!.id,
      items: {
        create: [
          { description: "Campaign concepting", quantity: 1, unitAmount: 3500_00, amount: 3500_00, position: 0 },
          { description: "Social asset production", quantity: 10, unitAmount: 250_00, amount: 2500_00, position: 1 },
        ],
      },
    },
  });
  await db.agency.update({ where: { id: agency.id }, data: { nextInvoiceNumber: number } });

  console.log("Seeded demo agency “Northwind Studio”.");
  console.log("  owner@northwind.test / password123  (owner)");
  console.log("  sam@northwind.test   / password123  (team member)");
  console.log("  jordan@acme.test     / password123  (client: Acme Inc.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
