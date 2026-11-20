import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const LIB = process.env.LIB ?? "mui-x";
const URL = process.env.URL ?? `http://localhost:5173/?today=2026-11-05&lib=${LIB}`;
const SHOTS = process.env.SHOTS_DIR ?? "verify-shots";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const day = (date) => page.locator(`[data-date="${date}"]:not([aria-disabled])`).filter({ has: page.locator("span") }).first();
const classOf = (date) => day(date).getAttribute("class");
const classSoon = async (date, fragment) => {
  for (let i = 0; i < 20; i++) {
    if ((await classOf(date)).includes(fragment)) return true;
    await page.waitForTimeout(50);
  }
  return false;
};
const notice = page.getByRole("status");
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const timeClickToPaint = (date) => page.evaluate((date) => new Promise((resolve) => {
  const target = document.querySelector(`[data-date="${date}"]`);
  let start = 0;
  setTimeout(() => resolve(Number.NaN), 3000);
  const observer = new MutationObserver(() => {
    observer.disconnect();
    requestAnimationFrame(() => setTimeout(() => resolve(performance.now() - start)));
  });
  document.addEventListener("pointerup", () => {
    start = performance.now();
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
  }, { capture: true, once: true });
  const box = target.getBoundingClientRect();
  window.__clickAt = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}), date);
const shot = (label) => page.screenshot({ path: `${SHOTS}/${LIB}-${label}.png` });

try {
  await page.goto(URL);
  await page.getByText("Month cycles").waitFor();

  await page.locator("[data-date]").first().waitFor();
  const reactVersion = await page.evaluate(() => window.__REACT_VERSION__ ?? null);
  check("runs on React 18.3.1", reactVersion === "18.3.1", `React ${reactVersion}`);
  check("continues-into divider is shown", await page.getByText("Continues into 2027").count() === 1);
  check("year grid renders 13 months, Jan 2026 to Jan 2027", await page.getByText("January 2027", { exact: true }).count() === 1);
  check("today is badged", (await day("2026-11-05").innerHTML()).includes("bg-[#1A5EA5]"));
  check("blocked day is crossed out", (await classOf("2026-11-29")).includes("service-day-blocked"));
  check("cycle start has the service-colour left edge", (await classOf("2026-11-01")).includes("border-l-4"));
  check("generated days are green", (await classOf("2026-11-20")).includes("bg-[#D3EFDD]"));
  const panel = page.getByTestId("cycles-panel");
  check("December starts blank: no cycle start and nothing generated",
    !(await classOf("2026-12-01")).includes("border-l-4") && !(await classOf("2026-12-02")).includes("bg-[#D3EFDD]") && await panel.locator('[data-cycle="2026-12-01"]').count() === 0);
  check("no Generate button while November has no end", await page.getByRole("button", { name: /^Generate/ }).count() === 0);
  check("panel marks November as Now", await panel.locator('[data-cycle="2026-11-01"]').getByText("Now").count() === 1);
  await shot("1-view");

  await page.getByRole("button", { name: /Edit calendar/ }).click();
  await page.getByRole("button", { name: "Set cycle start" }).click();
  await day("2026-12-01").click();
  check("1 Dec becomes a cycle start", await classSoon("2026-12-01", "border-l-4"), await notice.textContent());
  check("December enrolment markers show under 1 to 20 Nov", (await day("2026-11-10").locator("i").count()) === 2);
  await day("2027-01-01").click();
  check("1 Jan closes the December cycle", await classSoon("2027-01-01", "border-l-4"), await notice.textContent());
  check("panel shows December cycle as Enrolment open", await panel.locator('[data-cycle="2026-12-01"]').getByText("Enrolment open").count() === 1);

  await page.getByRole("button", { name: "Block day" }).click();
  await day("2026-12-08").click();
  check("block day toggles a future lesson day", await classSoon("2026-12-08", "service-day-blocked"), await notice.textContent());
  await day("2026-12-15").click({ modifiers: ["Shift"] });
  check("shift-click blocks the range", (await notice.textContent()) === "7 days blocked (8 Dec to 15 Dec)", await notice.textContent());
  check("blocked range lowers the December weekday counts", await panel.locator('[data-cycle="2026-12-01"] [title*="blocked"]').count() > 0);
  await shot("2-edit-block-range");

  await day("2026-11-03").click();
  check("past days refuse edits", (await notice.textContent()) === "This day has already passed.");

  const clickTimes = [];
  for (let i = 0; i < 12; i++) {
    const box = await day("2026-12-17").boundingBox();
    const timing = timeClickToPaint("2026-12-17");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    clickTimes.push(await timing);
  }
  const painted = clickTimes.filter(Number.isFinite);
  check("every click repaints within 3 s", painted.length === clickTimes.length, `${painted.length} of ${clickTimes.length}; missed at ${clickTimes.map((t, i) => Number.isFinite(t) ? null : i).filter((i) => i !== null).join(",")}`);
  console.log(`TIMING click-to-paint median ${median(painted).toFixed(0)} ms, range ${Math.min(...painted).toFixed(0)} to ${Math.max(...painted).toFixed(0)} ms`);
  check("toggling a day twelve times leaves it unblocked", !(await classOf("2026-12-17")).includes("service-day-blocked"));

  const lastNovember = await day("2026-11-30").boundingBox();
  const noticeBefore = await notice.textContent();
  const decemberFirstBefore = await classOf("2026-12-01");
  await page.mouse.click(lastNovember.x + lastNovember.width * 1.5, lastNovember.y + lastNovember.height / 2);
  await page.waitForTimeout(300);
  check("clicking the spill-over copy of 1 Dec in the November grid does not edit 1 Dec",
    (await classOf("2026-12-01")) === decemberFirstBefore && (await notice.textContent()) === noticeBefore,
    `notice after: ${await notice.textContent()}`);

  await page.getByRole("button", { name: "Set cycle start" }).click();
  await day("2027-01-19").click();
  check("cycle start can be added in the continuing January", await classSoon("2027-01-19", "border-l-4"), await notice.textContent());

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("select").nth(1).selectOption("1");
  check("enrolment dialog rejects bad dates", await dialog.getByText("Cancellations must close after enrolment opens.").count() === 1);
  await dialog.locator("select").nth(1).selectOption("14");
  await dialog.getByRole("button", { name: "Save" }).click();
  check("enrolment stamp saves", (await page.getByText("1st–20th · cancel by 13th").count()) === 1, await notice.textContent());
  await shot("3-edit-cycle-start");
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Generate December cycle" }).click();
  check("Generate turns December lesson days green", await classSoon("2026-12-02", "bg-[#D3EFDD]"), await notice.textContent());
  check("generate notice names the cycle and its dates", /^December cycle generated: \d+ lesson days, 1 Dec to 31 Dec$/.test(await notice.textContent()), await notice.textContent());
  check("panel stamps December as generated today", await panel.locator('[data-cycle="2026-12-01"]').getByText(/Generated 5 Nov/).count() === 1);
  await shot("4-generated-december");

  await page.getByRole("button", { name: /Service B/ }).click();
  check("switching service redraws with Service B cycles", await panel.locator('[data-cycle="2026-07-28"]').count() === 1);
  const yearStart = Date.now();
  await page.getByRole("button", { name: "Next year" }).click();
  await page.getByText("January 2028", { exact: true }).waitFor();
  console.log(`TIMING year switch ${Date.now() - yearStart} ms including automation round-trip`);
  check("year stepper moves to 2027", (await page.getByTestId("year").textContent()) === "2027" && await page.getByText("January 2028", { exact: true }).count() === 1);
  await shot("5-service-b-2027");
} finally {
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" || "));
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
