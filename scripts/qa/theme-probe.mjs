/*
 * Theme regression probe.
 *
 * Usage: start the dev server, then
 *   node scripts/qa/theme-probe.mjs
 * Set PW_CHROMIUM_PATH if Playwright's bundled browser is not installed.
 */
import { chromium } from "@playwright/test";

const base = "http://localhost:8080";

const probe = async (page) => {
  return page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      classes: document.documentElement.className.trim(),
      primary: cs.getPropertyValue("--primary").trim(),
      background: cs.getPropertyValue("--background").trim(),
      accent: cs.getPropertyValue("--accent").trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      btnBg: (() => {
        const b = document.querySelector("button");
        return b ? getComputedStyle(b).backgroundColor : "none";
      })(),
    };
  });
};

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ colorScheme: "light" });

async function scenario(label, theme, colorTheme) {
  await page.goto(`${base}/contact`, { waitUntil: "networkidle" });
  await page.evaluate(
    ([t, c]) => {
      localStorage.setItem("theme", t);
      localStorage.setItem("colorTheme", c);
    },
    [theme, colorTheme]
  );
  await page.reload({ waitUntil: "networkidle" });
  const r = await probe(page);
  console.log(`${label.padEnd(28)} classes="${r.classes}" primary=${r.primary} bg=${r.background}`);
  return r;
}

const results = {};
results.defaultLight = await scenario("default / light", "light", "default");
results.oceanLight = await scenario("ocean / light", "light", "ocean");
results.forestLight = await scenario("forest / light", "light", "forest");
results.defaultDark = await scenario("default / dark", "dark", "default");
results.oceanDark = await scenario("ocean / dark", "dark", "ocean");
results.custom = await page.evaluate(() => {
  localStorage.setItem("customThemes", JSON.stringify([
    { name: "Test", value: "custom-test", colors: { primary: "#7c3aed", secondary: "#ddd6fe", accent: "#db2777", background: "#ffffff", foreground: "#111111" } },
  ]));
  localStorage.setItem("colorTheme", "custom-test");
  localStorage.setItem("theme", "light");
  return true;
});
await page.reload({ waitUntil: "networkidle" });
const customProbe = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());
console.log(`custom / light            inline --primary=${customProbe}`);

console.log("\nDIFFS (expected: every pick differs from default)");
const d = results.defaultLight;
for (const [k, r] of Object.entries(results)) {
  if (k === "defaultLight") continue;
  const changed = r.primary !== d.primary || r.background !== d.background;
  console.log(`  ${k.padEnd(16)} ${changed ? "CHANGED" : "NO VISUAL CHANGE"}`);
}

// --- extra scenarios: custom theme in dark, class cleanup, live system mode ---
await page.goto(`${base}/contact`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.setItem("customThemes", JSON.stringify([
    { name: "Test", value: "custom-test", colors: { primary: "#7c3aed", secondary: "#ddd6fe", accent: "#db2777" } },
  ]));
  localStorage.setItem("colorTheme", "custom-test");
  localStorage.setItem("theme", "dark");
});
await page.reload({ waitUntil: "networkidle" });
const customDark = await page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return {
    primary: cs.getPropertyValue("--primary").trim(),
    background: cs.getPropertyValue("--background").trim(),
    inlineBg: document.documentElement.style.getPropertyValue("--background"),
    classes: document.documentElement.className.trim(),
  };
});
console.log(`
custom / dark             primary=${customDark.primary} bg=${customDark.background} inlineBg="${customDark.inlineBg}" classes="${customDark.classes}"`);

// switching back to default must strip the theme class
await page.evaluate(() => localStorage.setItem("colorTheme", "ocean"));
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("colorTheme", "default"));
await page.reload({ waitUntil: "networkidle" });
const afterReset = await page.evaluate(() => ({
  classes: document.documentElement.className.trim(),
  primary: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  inlinePrimary: document.documentElement.style.getPropertyValue("--primary"),
}));
console.log(`back to default           classes="${afterReset.classes}" primary=${afterReset.primary} inlinePrimary="${afterReset.inlinePrimary}"`);

// live system-mode switch (no reload)
await page.emulateMedia({ colorScheme: "light" });
await page.evaluate(() => localStorage.setItem("theme", "system"));
await page.reload({ waitUntil: "networkidle" });
const sysLight = await page.evaluate(() => document.documentElement.className.trim());
await page.emulateMedia({ colorScheme: "dark" });
await page.waitForTimeout(400);
const sysDark = await page.evaluate(() => document.documentElement.className.trim());
console.log(`system mode               light="${sysLight}" -> after OS switch="${sysDark}"`);
await browser.close();
