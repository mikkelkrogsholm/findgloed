import { join } from "node:path";
import { readConfig } from "./config";
import { createPool, PostgresLeadRepository } from "./db";
import { PostgresMembershipRepository } from "./membership";
import { PostgresEventRepository } from "./events";

async function run(): Promise<void> {
  const config = readConfig();
  const pool = createPool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    ssl: config.dbSsl,
    sslRejectUnauthorized: config.dbSslRejectUnauthorized
  });

  void new PostgresLeadRepository(pool);
  const membership = new PostgresMembershipRepository(pool);
  const events = new PostgresEventRepository(pool);

  // Verificér superadmin så han kan teste alle medlems-features.
  const superAdminEmail = config.superAdminEmail.toLowerCase();
  const adminRow = await pool.query<{ id: string }>(
    `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
    [superAdminEmail]
  );
  const adminId = adminRow.rows[0]?.id;
  if (adminId) {
    await membership.updateProfile(adminId, {
      display_name: "Mikkel",
      birth_year: 1985,
      region: "København",
      bio:
        "Solo-udvikler bag Glød og medstifter. Verificering er sat manuelt i seed.",
      face_visibility: "after_interest"
    });
    await pool.query(
      `UPDATE "user" SET verification_status = 'verified', verified_at = NOW(), onboarded_at = NOW() WHERE id = $1`,
      [adminId]
    );
    console.log(`✓ Superadmin verificeret: ${superAdminEmail}`);
  } else {
    console.warn("⚠ Superadmin findes ikke endnu — kør serveren én gang først.");
  }

  // Demo events.
  const now = new Date();
  function daysFromNow(days: number, hour = 19): Date {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  type Demo = Parameters<typeof events.insert>[0];
  const demos: Demo[] = [
    {
      slug: "intim-aabning-koebenhavn",
      title: "Intim åbning — en aften om nærvær",
      description:
        "En faciliteret aften med øvelser i nærvær og åbning. Vi arbejder med åndedræt, blikkontakt og kropsbevidsthed — påklædt hele aftenen.\n\nAftenen ledes af en sexolog fra Sexologisk Akademi. Du går derfra med en tydeligere fornemmelse af hvad nærvær gør ved kontakten.",
      not_for:
        "Kommer du for at finde en at gå hjem med? Vælg et andet event. Det her er for dig der vil arbejde med tilstedeværelse.",
      category: "mixed",
      level: "sensual_social",
      beginner_friendly: true,
      experience_required: false,
      facilitator_user_id: null,
      facilitator_name: "Mette Kristensen",
      facilitator_credential: "Sexolog, Sexologisk Akademi",
      starts_at: daysFromNow(7, 19),
      ends_at: daysFromNow(7, 22),
      capacity: 16,
      price_cents: 49500,
      region: "København",
      location_label: "Indre by, København",
      location_address: "Skoubogade 2, 1158 København",
      dresscode: "Casual chic. Påklædt hele aftenen.",
      exit_strategy: "Du kan rejse dig stille og forlade rummet når som helst.",
      cover_path: null,
      status: "published",
      created_by: adminId ?? null
    },
    {
      slug: "aerlig-aften-for-par",
      title: "Ærlig aften — for par der vil tale ærligt",
      description:
        "En aften kun for par. Faciliterede øvelser om begær, grænser og det der ikke bliver sagt højt mellem to mennesker der har levet sammen længe.\n\nIngen kropskontakt mellem fremmede. I deler kun med jeres egen partner.",
      not_for:
        "Par der søger spænding mellem fremmede. Det her er om jeres relation.",
      category: "couple_only",
      level: "sensual",
      beginner_friendly: false,
      experience_required: false,
      facilitator_user_id: null,
      facilitator_name: "Henrik Sørensen",
      facilitator_credential: "Sexolog, Sexologisk Akademi",
      starts_at: daysFromNow(14, 18),
      ends_at: daysFromNow(14, 22),
      capacity: 8,
      price_cents: 89000,
      region: "København",
      location_label: "Vesterbro, København",
      location_address: "Sønder Boulevard 84, 1720 København",
      dresscode: "Behageligt, gerne smukt.",
      exit_strategy: "I kan altid trække jer ind i et tilstødende rum eller forlade aftenen.",
      cover_path: null,
      status: "published",
      created_by: adminId ?? null
    },
    {
      slug: "singles-i-halvmoerket",
      title: "Singles i halvmørket — en sanselig aften",
      description:
        "Singles mødes til en kuraderet aften med dæmpet lys, stemningsmusik og strukturerede samtaler — designet så du kan møde folk uden at skulle 'sælge' dig selv.\n\nFor dig der ikke ønsker dating-app-flade, men heller ikke en spirituel weekend.",
      not_for: "Folk der primært søger hookups eller er forsigtigt-nysgerrige om relationen til en partner.",
      category: "single_only",
      level: "sensual_social",
      beginner_friendly: true,
      experience_required: false,
      facilitator_user_id: null,
      facilitator_name: "Sara Lund",
      facilitator_credential: "Sexolog, vært",
      starts_at: daysFromNow(21, 19),
      ends_at: daysFromNow(21, 23),
      capacity: 24,
      price_cents: 39500,
      region: "Aarhus",
      location_label: "Latinerkvarteret, Aarhus",
      location_address: "Mejlgade 32B, 8000 Aarhus C",
      dresscode: "Voksen casual.",
      exit_strategy: "Du kan rejse dig fra ethvert format og finde et stille hjørne.",
      cover_path: null,
      status: "published",
      created_by: adminId ?? null
    },
    {
      slug: "eksplicit-fest-koebenhavn",
      title: "Eksplicit aften — kun for erfarne",
      description:
        "En aften med klare rammer hvor alt går inden for samtykke. Faciliteret af to værter, code of conduct læses op før kl 21.\n\nKun for medlemmer der har deltaget i mindst ét tidligere event hos Glød eller har anden relevant erfaring.",
      not_for:
        "Folk der er nye i eksplicitte rum, eller som søger en blødere ramme. Vi har andre events.",
      category: "mixed",
      level: "explicit",
      beginner_friendly: false,
      experience_required: true,
      facilitator_user_id: null,
      facilitator_name: "Jens & Pia",
      facilitator_credential: "Værter, Sexologisk Akademi",
      starts_at: daysFromNow(28, 21),
      ends_at: daysFromNow(28, 24),
      capacity: 30,
      price_cents: 145000,
      region: "København",
      location_label: "Lokation oplyses efter tilmelding",
      location_address: "Adresse oplyses 24 timer før eventet starter",
      dresscode: "Mørkt, stilfuldt. Ingen dagligdag.",
      exit_strategy: "Stille-rum tilgængeligt hele aftenen. Vagt ved døren der følger dig ud hvis du har brug for det.",
      cover_path: null,
      status: "published",
      created_by: adminId ?? null
    }
  ];

  let inserted = 0;
  let skipped = 0;
  for (const demo of demos) {
    const existing = await events.getBySlug(demo.slug);
    if (existing) {
      skipped++;
      continue;
    }
    await events.insert(demo);
    inserted++;
  }
  console.log(`✓ Demo events: ${inserted} oprettet, ${skipped} eksisterede allerede.`);

  await pool.end();
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
