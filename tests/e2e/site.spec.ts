import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const catalog = JSON.parse(readFileSync("content/catalog.json", "utf8")) as {
  current: Record<string, string>;
  documents: Record<string, { title: string; versions: Record<string, object> }>;
};

const slugs = ["terms", "privacy", "security", "continuity"] as const;

test("home lists all four policies and excludes indexing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Taskly の規約とポリシー" })).toBeVisible();
  for (const slug of slugs) {
    await expect(page.locator(`a[href="/${slug}/"]`).first()).toBeVisible();
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("main h1")).toHaveCount(1);
});

for (const slug of slugs) {
  test(`current ${slug} route has a readable document and TOC`, async ({ page, isMobile }) => {
    await page.goto(`/${slug}/`);
    await expect(
      page.getByRole("heading", { name: catalog.documents[slug].title, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(`版 ${catalog.current[slug]}`)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "パンくずリスト" })).toBeVisible();
    if (isMobile) {
      const toc = page.locator("details.mobile-toc");
      await expect(toc.locator("summary")).toBeVisible();
      await toc.locator("summary").click();
      await expect(toc.locator("a").first()).toBeVisible();
    } else {
      await expect(
        page.getByRole("complementary", { name: "ページ内目次" }).locator("a").first(),
      ).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Markdown で読む" })).toHaveAttribute(
      "href",
      `/${slug}/${catalog.current[slug]}.md`,
    );
  });

  for (const version of Object.keys(catalog.documents[slug].versions)) {
    test(`fixed ${slug} ${version} HTML and Markdown routes`, async ({ page, request }) => {
      await page.goto(`/${slug}/${version}/`);
      await expect(
        page.getByRole("heading", { name: catalog.documents[slug].title, level: 1 }),
      ).toBeVisible();
      await expect(page.getByText(`版 ${version}`)).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(catalog.documents[slug].title));
      const markdown = await request.get(`/${slug}/${version}.md`);
      expect(markdown.status()).toBe(200);
      expect(markdown.headers()["content-type"]).toContain("text/markdown");
      expect(await markdown.text()).toContain(`# ${catalog.documents[slug].title}`);
      expect(await markdown.text()).not.toContain("<empty-block/>");
      expect(markdown.headers()["x-robots-tag"]).toContain("noindex");
    });
  }
}

test("theme follows the operating system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /テーマ/ })).toHaveCount(0);
  const dark = await page
    .locator("html")
    .evaluate((element) => getComputedStyle(element).colorScheme);
  expect(dark).toBe("dark");
  await page.emulateMedia({ colorScheme: "light" });
  const light = await page
    .locator("html")
    .evaluate((element) => getComputedStyle(element).colorScheme);
  expect(light).toBe("light");
  await expect(page.locator("img.brand-logo")).toBeVisible();
});

test("history opens a diff against the previous version", async ({ page }) => {
  await page.goto("/privacy/");
  await page
    .getByRole("navigation", { name: "文書のリンク" })
    .getByRole("link", { name: "改定履歴" })
    .click();
  await expect(page.getByRole("heading", { name: "プライバシーポリシーの改定履歴" })).toBeVisible();
  await page.getByRole("link", { name: "前の版との差分を見る" }).click();
  await expect(page.getByRole("heading", { name: "版 2026-09-23.1 の変更" })).toBeVisible();
  await expect(page).toHaveTitle(/プライバシーポリシー 2026-09-23.1の変更/);
  await expect(
    page.getByRole("region", { name: "Markdown の変更差分" }).locator(".diff-added").first(),
  ).toBeVisible();
  const diffOverflows = await page
    .getByRole("region", { name: "Markdown の変更差分" })
    .evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(diffOverflows).toBe(false);
});

test("source artifact is hidden from the security page", async ({ page }) => {
  await page.goto("/security/");
  await expect(page.getByText("<empty-block/>")).toHaveCount(0);
});

test("unknown route is a real 404", async ({ page }) => {
  const response = await page.goto("/does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
});

test("small screen has no horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile viewport only");
  await page.goto("/terms/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test("capture review screenshots", async ({ page, isMobile }) => {
  await mkdir("docs/screenshots", { recursive: true });
  await page.emulateMedia({ colorScheme: isMobile ? "dark" : "light" });
  const prefix = isMobile ? "mobile-dark" : "desktop-light";
  await page.goto("/");
  await expect(page.getByRole("link", { name: "利用規約" })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/${prefix}-home.png`, fullPage: true });
  await page.getByRole("link", { name: "利用規約" }).focus();
  await page.screenshot({ path: `docs/screenshots/${prefix}-focus.png`, fullPage: false });
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { name: "プライバシーポリシー", level: 1 })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/${prefix}-runtime-title.png`, fullPage: false });
  await page.screenshot({ path: `docs/screenshots/${prefix}-privacy.png`, fullPage: true });
  await page.screenshot({ path: `docs/screenshots/${prefix}-runtime-privacy.png`, fullPage: true });
  await page.goto("/privacy/history/2026-09-23.1/");
  await expect(page.getByRole("heading", { name: "版 2026-09-23.1 の変更" })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/${prefix}-diff.png`, fullPage: false });
  await page.goto("/security/2026-09-22.1.md");
  await page.screenshot({
    path: `docs/screenshots/${prefix}-security-markdown.png`,
    fullPage: false,
  });
});
