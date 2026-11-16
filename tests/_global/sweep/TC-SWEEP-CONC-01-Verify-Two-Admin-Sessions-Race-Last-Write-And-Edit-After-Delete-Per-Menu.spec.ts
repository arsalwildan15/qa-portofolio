/**
 * ================================================================================
 * TC-SWEEP-CONC-01 — Verify Two Concurrent Admin Sessions On Every Named-Entity Menu: Create Race, Last Write, Edit After Delete
 * Modul    : 19 menu entitas bernama (registry src/data/unitMutationRegistry.ts)
 * Kategori : Edge (!) 4.4 4.7 | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-CONC-01-Verify-Two-Admin-Sessions-Race-Last-Write-And-Edit-After-Delete-Per-Menu.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * PRASYARAT: dua sesi Admin INDEPENDEN (sesi A = fixture, sesi B = login baru di context terpisah),
 * mewakili dua admin yg bekerja bersamaan. Semua record uji berprefix "QaConc" & dihapus di akhir.
 *
 * TUJUAN (per menu, label [U###]):
 *   4.4  Sesi A & B membuat nama yg SAMA secara paralel, 5 putaran -> tidak pernah 2 record &
 *        tidak pernah 5xx (menu ber-nama unik; KPI boleh duplikat by design -> finding).
 *   4.7  A mengganti nama, lalu B (dgn data lama) mengganti nama -> kedua request tidak 5xx dan
 *        record berakhir konsisten = nilai B. Perilaku last-write-wins tanpa deteksi konflik
 *        dicatat sbg finding (tidak ada field versi di API).
 *   4.7 / 6.1  A menghapus record, lalu B menyimpan edit atas record itu -> 4xx (bukan 2xx/5xx)
 *        dan record TIDAK muncul kembali di daftar.
 *
 * HASIL 16 Nov 2026: 39/58 lolos (probe 5 putaran/menu dibuktikan ulang). SENGAJA FAILED (R3):
 *   4.4 cek keunikan nama di server tidak atomik -> 2 sesi paralel menghasilkan 2 record bernama
 *       sama di menu ber-nama unik (1-4 dari 5 putaran); Pay Grades punya constraint DB tetapi
 *       request yg kalah dijawab 500; Locations & Reporting Methods selalu 2 (BG-426). = BUG BG-428 (Medium)
 *   4.7 Job Titles & Leave Types: PUT atas record yg sudah dihapus -> 200 (sukses palsu; menu lain
 *       404 "Record Not Found"). = BUG BG-430 (Low)
 *   Finding: semua menu last-write-wins tanpa deteksi konflik.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-CONC-01-Verify-Two-Admin-Sessions-Race-Last-Write-And-Edit-After-Delete-Per-Menu.spec.ts --project=chromium
 * ================================================================================
 */

import { type APIRequestContext } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { loginAs } from '../../../src/utils/loginAs';
import { MUTATION_UNITS, mutationContext, type MutationUnit } from '../../../src/data/unitMutationRegistry';

const API = '/web/index.php/api/v2/';
type Row = Record<string, unknown>;
const RACE_ROUNDS = 5;
const rows = async (req: APIRequestContext, u: MutationUnit): Promise<Row[]> =>
  (((await (await req.get(`${API}${u.endpoint}?limit=0`)).json().catch(() => null)) as { data?: Row[] } | null)?.data ?? []);

test('TC-SWEEP-CONC-01: two admin sessions - create race, last write and edit after delete per menu', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(MUTATION_UNITS.length * 75_000 + 120_000);
  const report = new TestReport('TC-SWEEP-CONC-01', 'Two Admin Sessions Race Last Write Edit After Delete', env.baseURL);
  const ctx = await mutationContext(page);
  const a = page.request;
  const sessB = await loginAs(browser, env.username, env.password);
  const b = sessB.page.request;

  report.step('Prasyarat: dua sesi Admin aktif bersamaan');
  const [meA, meB] = await Promise.all([a.get(`${API}admin/job-titles?limit=1`), b.get(`${API}admin/job-titles?limit=1`)]);
  report.check('Sesi A & B sama-sama aktif (login kedua tidak mematikan sesi pertama)', meA.status() === 200 && meB.status() === 200, `A=${meA.status()}, B=${meB.status()}`);

  try {
    for (const u of MUTATION_UNITS) {
      const tag = `[${u.id} ${u.path}]`;
      const ep = API + u.endpoint;
      const s = `${Date.now() % 100000}`;
      const body = (name: string) => u.body(name, ctx);

      // ---------------------------------------------------------------- 4.4 parallel create
      report.step(`${tag} create paralel dari 2 sesi`);
      // A check-then-insert race only shows on some attempts (live probe 2026-11-16: 1-4 of 5 rounds
      // per menu), so 5 rounds are fired and ANY duplicate or 5xx fails the check.
      const rounds: string[] = [];
      let dupRounds = 0, errRounds = 0;
      for (let i = 0; i < RACE_ROUNDS; i++) {
        const raceName = `QaConcRace ${s}${i}`;
        const [ra, rb] = await Promise.all([a.post(ep, { data: body(raceName) }), b.post(ep, { data: body(raceName) })]);
        const raced = (await rows(a, u)).filter((r) => r[u.nameKey] === raceName);
        if (raced.length > 1) dupRounds++;
        if (ra.status() >= 500 || rb.status() >= 500) errRounds++;
        rounds.push(`${ra.status()}/${rb.status()}:${raced.length}`);
      }
      const detail = `${RACE_ROUNDS} putaran (A/B:record) ${rounds.join(' ')}`;
      if (u.uniqueName) report.check(`${tag} 4.4 Nama sama dibuat paralel oleh 2 sesi (${RACE_ROUNDS}x) -> tidak pernah 2 record & tidak pernah 5xx`, dupRounds === 0 && errRounds === 0, detail);
      else report.finding(`${tag} 4.4 create paralel`, `${detail} (nama boleh duplikat by design)`);

      // ---------------------------------------------------------------- 4.7 last write
      report.step(`${tag} edit bersamaan`);
      const base = await a.post(ep, { data: body(`QaConcBase ${s}`) });
      const id = ((await base.json().catch(() => null)) as { data?: { id?: number } } | null)?.data?.id;
      if (base.status() !== 200 || typeof id !== 'number') {
        report.finding(`${tag} dilewati`, `create dasar gagal status=${base.status()}`);
      } else {
        const staleOnB = await (await b.get(`${ep}/${id}`)).json().catch(() => null);
        const putA = await a.put(`${ep}/${id}`, { data: body(`QaConcA ${s}`) });
        const putB = await b.put(`${ep}/${id}`, { data: body(`QaConcB ${s}`) });
        const final = ((await (await a.get(`${ep}/${id}`)).json().catch(() => null)) as { data?: Row } | null)?.data?.[u.nameKey];
        report.check(`${tag} 4.7 A lalu B mengedit record yg sama -> tanpa 5xx, hasil akhir konsisten (= nilai B)`, putA.status() === 200 && putB.status() === 200 && final === `QaConcB ${s}`, `A=${putA.status()}, B=${putB.status()}, akhir=${JSON.stringify(final)}`);
        report.finding(`${tag} 4.7 deteksi konflik`, `B menimpa perubahan A tanpa peringatan (last-write-wins); B memegang data lama ${JSON.stringify((staleOnB as { data?: Row } | null)?.data?.[u.nameKey])}`);

        // -------------------------------------------------------------- 4.7 edit after delete
        report.step(`${tag} edit setelah dihapus sesi lain`);
        const delA = await a.delete(ep, { data: { ids: [id] } });
        const putAfter = await b.put(`${ep}/${id}`, { data: body(`QaConcGhost ${s}`) });
        const back = (await rows(a, u)).some((r) => r['id'] === id);
        report.check(`${tag} 4.7 / 6.1 B menyimpan edit atas record yg sudah dihapus A -> 4xx & record tidak muncul kembali`, delA.status() === 200 && putAfter.status() >= 400 && putAfter.status() < 500 && !back, `delete=${delA.status()}, putB=${putAfter.status()}, munculLagi=${back}`);
        if (back) await a.delete(ep, { data: { ids: [id] } });
      }

      const left = (await rows(a, u)).filter((r) => String(r[u.nameKey] ?? '').startsWith('QaConc')).map((r) => r['id']);
      if (left.length) await a.delete(ep, { data: { ids: left } });
    }
  } finally {
    await sessB.close();
  }
  report.print();
});
