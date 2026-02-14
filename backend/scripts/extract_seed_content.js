/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function readDashboardJs() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const dashboardPath = path.resolve(
    repoRoot,
    "frondend",
    "landing page",
    "dashboard.js",
  );
  if (!fs.existsSync(dashboardPath)) {
    throw new Error(
      `Legacy dashboard.js not found at: ${dashboardPath}\n` +
        "This script is optional and only used to regenerate seed content.\n" +
        "If you've deleted the legacy UI folder, seed content already exists at backend/apps/learning/seed_data/seed.json.",
    );
  }
  return fs.readFileSync(dashboardPath, "utf8");
}

function extractDecks(dashboardJs) {
  const marker = "// Current session variables";
  const prefix = dashboardJs.split(marker)[0];

  const context = {};
  vm.createContext(context);

  const exportCode = `
this.__decks = {
  bodyPartsWords,
  elementaryWords,
  elementaryWords2,
  timesWords,
  foodsWords,
  householdItemsWords,
  professionsWords,
  animalsWords,
};
`;

  vm.runInContext(`${prefix}\n${exportCode}`, context);
  return context.__decks;
}

function buildSeedJson(decks) {
  const course = {
    title: "General Ingiliz tili lug'atlari",
    slug: "general-english-vocabulary",
    description: "",
  };

  const lessons = [
    {
      slug: "body-parts",
      title: "Odam ta'na a'zolari",
      cover_image_path: "/picture/human body.png",
      order: 1,
      cards: decks.bodyPartsWords,
    },
    {
      slug: "animals",
      title: "Hayvonlar",
      cover_image_path: "/picture/animals.png",
      order: 2,
      cards: decks.animalsWords,
    },
    {
      slug: "professions",
      title: "Kasblar",
      cover_image_path: "/picture/jobs.png",
      order: 3,
      cards: decks.professionsWords,
    },
    {
      slug: "household",
      title: "Uy jihozlari",
      cover_image_path: "/picture/home appliance.png",
      order: 4,
      cards: decks.householdItemsWords,
    },
    {
      slug: "foods",
      title: "Ovqatlar",
      cover_image_path: "/picture/foods.png",
      order: 5,
      cards: decks.foodsWords,
    },
    {
      slug: "times",
      title: "Vaqtlar",
      cover_image_path: "/picture/time.png",
      order: 6,
      cards: decks.timesWords,
    },
    {
      slug: "elementary",
      title: "Elementary so'zlar",
      cover_image_path: "/picture/elementry words.png",
      order: 7,
      cards: decks.elementaryWords,
    },
    {
      slug: "elementary2",
      title: "Elementary so'zlar 2",
      cover_image_path: "/picture/elementry words 2.png",
      order: 8,
      cards: decks.elementaryWords2,
    },
  ];

  const normalizedLessons = lessons.map((lesson) => ({
    slug: lesson.slug,
    title: lesson.title,
    cover_image_path: lesson.cover_image_path,
    order: lesson.order,
    cards: (lesson.cards || []).map((card, idx) => ({
      order: idx + 1,
      english: card.english,
      uzbek: card.uzbek,
      pronunciation: card.pronunciation || "",
      mnemonic_example: card.example || "",
      translation: card.translation || "",
    })),
  }));

  return { course, lessons: normalizedLessons };
}

function writeSeedFile(seedJson) {
  const outDir = path.resolve(__dirname, "..", "apps", "learning", "seed_data");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.resolve(outDir, "seed.json");
  fs.writeFileSync(outPath, JSON.stringify(seedJson, null, 2), "utf8");
  return outPath;
}

function main() {
  const dashboardJs = readDashboardJs();
  const decks = extractDecks(dashboardJs);
  const seedJson = buildSeedJson(decks);
  const outPath = writeSeedFile(seedJson);
  console.log(`Wrote seed content to: ${outPath}`);
}

main();
