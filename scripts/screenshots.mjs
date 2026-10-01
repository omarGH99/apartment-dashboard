// Captures the README / portfolio screenshots from a running build.
//   npm run build && npx vite preview --port 4173 &   (then)   npm run screenshots
// Uses the system Edge/Chrome via playwright-core, so no browser download is needed.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });

async function session({ width, height, dark = false, mobile = false }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1.5,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: dark ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('apt-banner', 'closed');
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  return { ctx, page };
}

const TITLES = {
  '/': 'Dashboard',
  '/units': 'Units',
  '/tenants': 'Tenants',
  '/payments': 'Payments',
  '/maintenance': 'Maintenance',
  '/announcements': 'Announcements',
  '/reports': 'Reports',
};

async function go(page, hash) {
  await page.goto(`${BASE}#${hash}`);
  const title = TITLES[hash.split('?')[0]];
  await page.getByRole('heading', { name: title, level: 1 }).waitFor({ timeout: 10000 });
  await page.waitForSelector('.page-enter', { timeout: 10000 });
  await page.waitForTimeout(700); // let charts finish animating
}

const shot = (page, name, opts = {}) => page.screenshot({ path: `${OUT}/${name}.png`, ...opts });

// ── Desktop, light ──
{
  const { ctx, page } = await session({ width: 1440, height: 900 });
  for (const [name, hash] of [
    ['01-dashboard', '/'],
    ['02-units-floor-map', '/units'],
    ['04-tenants', '/tenants'],
    ['05-payments', '/payments'],
    ['06-maintenance-board', '/maintenance'],
    ['07-announcements', '/announcements'],
    ['08-reports', '/reports'],
  ]) {
    await go(page, hash);
    await shot(page, name);
    console.log('captured', name);
  }

  await go(page, '/units?status=vacant');
  await page.getByRole('button', { name: /^List/ }).click();
  await shot(page, '03-units-list-filtered');

  await go(page, '/tenants');
  await page
    .getByRole('button', { name: /^Open / })
    .first()
    .click();
  await page.waitForSelector('[role=dialog]');
  await page.waitForTimeout(300);
  await shot(page, '09-tenant-dialog');

  await go(page, '/');
  await page.getByRole('button', { name: /Notifications/ }).click();
  await page.waitForTimeout(300);
  await shot(page, '10-notifications');

  await go(page, '/');
  await page.getByLabel('Search units, tenants and requests').fill('sara');
  await page.waitForTimeout(300);
  await shot(page, '11-global-search');
  await ctx.close();
}

// ── Desktop, dark ──
{
  const { ctx, page } = await session({ width: 1440, height: 900, dark: true });
  await go(page, '/');
  await shot(page, '12-dashboard-dark');
  await go(page, '/maintenance');
  await shot(page, '13-maintenance-dark');
  await ctx.close();
}

// ── Mobile ──
{
  const { ctx, page } = await session({ width: 390, height: 844, mobile: true });
  await go(page, '/');
  await shot(page, '14-mobile-dashboard');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.waitForTimeout(400);
  await shot(page, '15-mobile-menu');
  await go(page, '/payments');
  await shot(page, '16-mobile-payments');
  await ctx.close();
}

await browser.close();
console.log('done');
