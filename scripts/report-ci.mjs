import { readFileSync, writeFileSync } from "node:fs";

const coverage = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
const e2e = JSON.parse(readFileSync("test-results/e2e.json", "utf8"));
const metrics = Object.fromEntries(
  ["lines", "statements", "branches", "functions"].map((name) => [name, coverage.total[name].pct]),
);
for (const [name, percent] of Object.entries(metrics)) {
  if (percent < 80) throw new Error(`${name} coverage ${percent}% is below 80%`);
}
const passed = e2e.stats?.expected ?? 0;
const failed = e2e.stats?.unexpected ?? 0;
const skipped = e2e.stats?.skipped ?? 0;
if (failed > 0 || passed < 20) throw new Error("E2E suite did not cover the expected routes");
const catalog = JSON.parse(readFileSync("content/catalog.json", "utf8"));
const editionCount = Object.values(catalog.documents).reduce(
  (sum, document) => sum + Object.keys(document.versions).length,
  0,
);
const allSpecs = [];
function visit(suite) {
  allSpecs.push(...(suite.specs ?? []));
  for (const nested of suite.suites ?? []) visit(nested);
}
for (const suite of e2e.suites ?? []) visit(suite);
function passedOnBoth(title) {
  const spec = allSpecs.find((candidate) => candidate.title === title);
  return ["desktop-chromium", "mobile-chromium"].every((project) =>
    spec?.tests?.some(
      (test) =>
        test.projectName === project && test.results?.some((result) => result.status === "passed"),
    ),
  );
}
let observedRoutes = Number(passedOnBoth("home lists all four policies and excludes indexing"));
observedRoutes += Number(passedOnBoth("unknown route is a real 404"));
for (const [slug, document] of Object.entries(catalog.documents)) {
  observedRoutes += Number(passedOnBoth(`current ${slug} route has a readable document and TOC`));
  for (const version of Object.keys(document.versions)) {
    const passed = passedOnBoth(`fixed ${slug} ${version} HTML and Markdown routes`);
    observedRoutes += passed ? 2 : 0; // The same browser test requests both URLs.
  }
}
const declaredRoutes = 2 + 4 + editionCount * 2;
if (observedRoutes !== declaredRoutes) {
  throw new Error(
    `Observed public routes ${observedRoutes}/${declaredRoutes}; all declared routes must pass on both viewports`,
  );
}
const report = {
  metrics,
  e2e: {
    passed,
    failed,
    skipped,
    observedRoutes,
    declaredRoutes,
    desktopAndMobile: true,
    routeCoveragePercent: Math.round((observedRoutes / declaredRoutes) * 10000) / 100,
  },
};
writeFileSync("ci-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
