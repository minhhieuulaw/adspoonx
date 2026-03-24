import { prisma } from "../lib/prisma";

async function main() {
  const badCtas = [
    "No Button",
    "Join group",
    "Sell Now",
    "Inquire now",
    "Install app",
    "Install App",
    "Check Availability",
    "Book a consultation",
    "Get access",
  ];

  for (const cta of badCtas) {
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "Ad" WHERE COALESCE("rawData"->'snapshot'->'cards'->0->>'cta_text', "rawData"->'snapshot'->>'cta_text') = $1`,
      cta
    );
    console.log(`Deleted "${cta}": ${result}`);
  }

  const total = await prisma.ad.count();
  console.log(`\nTotal ads remaining: ${total}`);
  await prisma.$disconnect();
}

main().catch(console.error);
