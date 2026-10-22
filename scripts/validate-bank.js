const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("const BANK = [");
const end = html.indexOf("];", start);
if (start < 0 || end < 0) {
  throw new Error("Could not locate the BANK array in index.html.");
}

const source = html.slice(start, end + 2) + "\n;globalThis.__BANK = BANK;";
const context = {};
vm.runInNewContext(source, context);
const bank = context.__BANK;

const expectedCounts = {
  amontillado: 49,
  dangerous: 76,
  casey: 37,
  kite: 34
};
const errors = [];
const ids = new Set();
const prompts = new Set();
const actualCounts = {};

for (const q of bank) {
  actualCounts[q.unit] = (actualCounts[q.unit] || 0) + 1;

  if (!q.id || ids.has(q.id)) errors.push(`Missing or duplicate ID: ${q.id || "(empty)"}`);
  ids.add(q.id);

  if (!q.title || !q.author || !q.page || !q.pages || !q.q || !q.why || !q.ref) {
    errors.push(`${q.id}: missing required question/reference field`);
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    errors.push(`${q.id}: expected exactly four answer choices`);
  } else if (new Set(q.choices).size !== 4) {
    errors.push(`${q.id}: repeated answer choices`);
  }
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) {
    errors.push(`${q.id}: invalid correct-answer index`);
  }
  if (/provided textbook|selection or vocabulary note/i.test(q.ref || "")) {
    errors.push(`${q.id}: generic textbook reference remains`);
  }

  const prompt = q.unit + ":" + q.q.toLowerCase()
    .replace(/[“”"'.,?!:;—–-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (prompts.has(prompt)) errors.push(`${q.id}: duplicate question prompt`);
  prompts.add(prompt);
}

if (bank.length !== 196) errors.push(`Expected 196 questions, found ${bank.length}`);
for (const [unit, expected] of Object.entries(expectedCounts)) {
  if (actualCounts[unit] !== expected) {
    errors.push(`${unit}: expected ${expected} questions, found ${actualCounts[unit] || 0}`);
  }
}

if (errors.length) {
  console.error("Question-bank validation failed:");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}

console.log("Question-bank validation passed.");
console.log(`Total: ${bank.length}; unique IDs: ${ids.size}; by unit: ${JSON.stringify(actualCounts)}`);
