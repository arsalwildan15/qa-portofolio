/**
 * ================================================================================
 * TC-SWEEP-MUT-01 — Verify The Create/Update/Delete API Of Every Named-Entity Menu: CRUD, Validation, Injection, Mass Assignment
 * Modul    : 19 menu entitas bernama (registry src/data/unitMutationRegistry.ts, body ditangkap LIVE)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-U 1.1-D | Negative (-) 2.1 2.3 2.6 | Boundary (B) 3.1 |
 *            Edge (!) 4.1 | Security (S) 5.1-SQLi 5.2-MassAssign 5.5 | API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-MUT-01-Verify-Create-Update-Delete-Contract-Per-Menu.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN (per menu, label [U###]; semua record uji berprefix "QaMut" & dihapus di akhir):
 *   1.1-C  POST body valid -> 200 + id.          1.1-R  GET detail -> 200, nama sama.
 *   1.1-U  PUT ganti nama -> 200 & tersimpan.     1.1-D  DELETE {ids} -> 200 & record hilang dari daftar
 *          (beberapa entitas SOFT delete: detail tetap terbaca -> dicatat finding, bukan bug).
 *   2.1    body kosong {} -> 4xx (bukan 2xx/5xx); nama whitespace saja -> 4xx.
 *   2.3    nama duplikat -> 4xx bila nama unik (form menjawab "Already exists"); KPI boleh
 *          duplikat by design (TC-PERF-KPI-05) -> dicatat finding.
 *   3.1    nama 300 karakter -> 4xx (bukan diterima/terpotong diam-diam, bukan 5xx).
 *   4.1    nama Arab/CJK/aksen -> 200 & kembali identik; emoji -> bukan 5xx.
 *   5.1-SQLi  "' OR '1'='1 --" -> tersimpan sbg teks (identik) atau 4xx, tidak pernah 5xx.
 *   5.2-MassAssign  field ekstra (id/deleted/isDeleted) diabaikan: id baru != 999999, tidak terhapus.
 *   6.5    nama null -> 4xx; nama angka -> bukan 5xx.
 *   6.7    create yg sama dikirim 2x -> tidak membuat 2 record bila nama unik (= 2.3).
 *   5.5    5 create paralel -> dicatat (tanpa rate limit = finding, tidak membebani demo).
 *   2.6    PUT/DELETE id 999999 -> bukan 2xx/5xx.
 *
 * HASIL 16 Nov 2026: 19 menu. SENGAJA FAILED (bug, R3):
 *   U017 Work Shifts -> body tanpa startTime -> 500 (field lain yg hilang -> 422) = BUG
 *   U019 Locations & U039 Reporting Methods -> nama duplikat DITERIMA server (form UI menjawab
 *        "Already exists", jadi keunikan hanya dicek di klien) = BUG
 *   Finding: tidak ada rate limit di 19 menu (burst 5 create paralel semua 200); soft delete di Job
 *   Titles (detail tanpa penanda terhapus), Leave Types (deleted:true), Customers (detail -> 403).
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-MUT-01-Verify-Create-Update-Delete-Contract-Per-Menu.spec.ts --project=chromium
 * ================================================================================
 */

import { type APIResponse } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { MUTATION_UNITS, mutationContext } from '../../../src/data/unitMutationRegistry';

const API = '/web/index.php/api/v2/';
const is4xx = (s: number) => s >= 400 && s < 500;
const not5xx = (s: number) => s < 500;
const json = async (r: APIResponse) => (await r.json().catch(() => null)) as { data?: Record<string, unknown> } | null;

test('TC-SWEEP-MUT-01: create/update/delete contract, validation, injection and mass assignment per menu', async ({ page }, testInfo) => {
  testInfo.setTimeout(MUTATION_UNITS.length * 60_000);
  const report = new TestReport('TC-SWEEP-MUT-01', 'Create Update Delete Contract Per Menu', env.baseURL);
  const ctx = await mutationContext(page);

  for (const u of MUTATION_UNITS) {
    const tag = `[${u.id} ${u.path}]`;
    const ep = API + u.endpoint;
    const created: number[] = [];
    const s = `${Date.now() % 100000}`;
    const nm = (base: string) => `${base} ${s}`.slice(0, 48);
    const create = async (name: unknown, extra: Record<string, unknown> = {}) => {
      const r = await page.request.post(ep, { data: { ...u.body(String(name), ctx), [u.nameKey]: name, ...extra } });
      const id = (await json(r))?.data?.['id'];
      if (r.status() === 200 && typeof id === 'number') created.push(id);
      return { r, id: typeof id === 'number' ? id : undefined };
    };
    const read = async (id: number) => json(await page.request.get(`${ep}/${id}`));

    report.step(`${tag} CRUD dasar`);
    const name = nm('QaMut');
    const c = await create(name);
    report.check(`${tag} 1.1-C / 6.1 POST valid -> 200 + id`, c.r.status() === 200 && !!c.id, `status=${c.r.status()}`);
    if (!c.id) { report.finding(`${tag} dilewati`, 'create valid gagal -> check lain tidak bermakna'); continue; }
    const got = await read(c.id);
    report.check(`${tag} 1.1-R GET detail -> nama sama`, got?.data?.[u.nameKey] === name, `name=${JSON.stringify(got?.data?.[u.nameKey])}`);
    const renamed = nm('QaMutU');
    const up = await page.request.put(`${ep}/${c.id}`, { data: u.body(renamed, ctx) });
    const afterUp = await read(c.id);
    report.check(`${tag} 1.1-U PUT ganti nama -> 200 & tersimpan`, up.status() === 200 && afterUp?.data?.[u.nameKey] === renamed, `status=${up.status()}, name=${JSON.stringify(afterUp?.data?.[u.nameKey])}`);

    report.step(`${tag} validasi`);
    const empty = await page.request.post(ep, { data: {} });
    report.check(`${tag} 2.1 Body kosong -> 4xx (bukan 5xx)`, is4xx(empty.status()), `status=${empty.status()}`);
    const blank = await create('   ');
    report.check(`${tag} 2.1 Nama whitespace saja -> 4xx`, is4xx(blank.r.status()), `status=${blank.r.status()}`);
    const dup = await create(renamed);
    if (u.uniqueName) report.check(`${tag} 2.3 / 6.7 Nama duplikat -> 4xx (tidak membuat record kedua)`, is4xx(dup.r.status()), `status=${dup.r.status()}`);
    else report.finding(`${tag} 2.3 duplikat`, `status=${dup.r.status()} (nama boleh duplikat by design, TC-PERF-KPI-05)`);
    const long = await create(`QaMutLong${'X'.repeat(291)}`);
    report.check(`${tag} 3.1 Nama 300 karakter -> 4xx (bukan diterima/5xx)`, is4xx(long.r.status()), `status=${long.r.status()}`);

    report.step(`${tag} karakter tidak biasa & injeksi`);
    const uni = nm('QaMut مرحبا 你好 Ñandú');
    const cu = await create(uni);
    const gu = cu.id ? await read(cu.id) : null;
    report.check(`${tag} 4.1 Nama Arab/CJK/aksen -> 200 & identik`, cu.r.status() === 200 && gu?.data?.[u.nameKey] === uni, `status=${cu.r.status()}, name=${JSON.stringify(gu?.data?.[u.nameKey])}`);
    const emo = await create(nm('QaMut 🚀'));
    report.check(`${tag} 4.1 Nama emoji -> bukan 5xx`, not5xx(emo.r.status()), `status=${emo.r.status()}`);
    const sqli = nm("QaMut' OR '1'='1 --");
    const cs = await create(sqli);
    const gs = cs.id ? await read(cs.id) : null;
    report.check(`${tag} 5.1-SQLi Payload tersimpan sbg teks (identik) atau 4xx, bukan 5xx`, (cs.r.status() === 200 && gs?.data?.[u.nameKey] === sqli) || is4xx(cs.r.status()), `status=${cs.r.status()}, name=${JSON.stringify(gs?.data?.[u.nameKey])}`);

    report.step(`${tag} mass assignment & parameter negatif`);
    const ma = await create(nm('QaMutMA'), { id: 999999, deleted: true, isDeleted: true });
    const gma = ma.id ? await read(ma.id) : null;
    report.check(`${tag} 5.2-MassAssign Field ekstra diabaikan (id != 999999, tidak terhapus)`, (ma.r.status() === 200 && ma.id !== 999999 && gma?.data?.['deleted'] !== true && gma?.data?.['isDeleted'] !== true) || is4xx(ma.r.status()), `status=${ma.r.status()}, id=${ma.id}, deleted=${JSON.stringify(gma?.data?.['deleted'])}`);
    const nul = await create(null);
    report.check(`${tag} 6.5 Nama null -> 4xx`, is4xx(nul.r.status()), `status=${nul.r.status()}`);
    const num = await create(12345);
    report.check(`${tag} 6.5 Nama bertipe angka -> bukan 5xx`, not5xx(num.r.status()), `status=${num.r.status()}`);

    report.step(`${tag} id tak eksis & burst`);
    const put404 = await page.request.put(`${ep}/999999`, { data: u.body(nm('QaMutX'), ctx) });
    report.check(`${tag} 2.6 / 6.1 PUT id 999999 -> 404/422 (bukan 2xx/5xx)`, [404, 422].includes(put404.status()), `status=${put404.status()}`);
    const del404 = await page.request.delete(ep, { data: { ids: [999999] } });
    report.check(`${tag} 2.6 DELETE id 999999 -> bukan 5xx`, not5xx(del404.status()), `status=${del404.status()}`);
    const burst = await Promise.all([1, 2, 3, 4, 5].map((i) => create(nm(`QaMutB${i}`))));
    report.finding(`${tag} 5.5 Burst 5 create paralel`, `status=${burst.map((b) => b.r.status()).join(',')} -> ${burst.every((b) => b.r.status() === 200) ? 'tidak ada rate limit' : 'sebagian dibatasi'}`);

    report.step(`${tag} delete & cleanup`);
    const del = await page.request.delete(ep, { data: { ids: [c.id] } });
    const listAfter = (await json(await page.request.get(`${ep}?limit=0`))) as { data?: Array<Record<string, unknown>> } | null;
    const stillListed = (listAfter?.data ?? []).some((row) => row['id'] === c.id);
    // Several entities are SOFT-deleted (confirmed live 2026-11-16): the record leaves the list but its
    // detail stays readable -- Leave Types with deleted:true, Job Titles with no deleted marker at all,
    // Customers answering 403. "Removed for the user" is therefore judged on the list; the detail
    // behaviour is recorded as a finding.
    report.check(`${tag} 1.1-D DELETE -> 200 & record hilang dari daftar`, del.status() === 200 && !stillListed, `delete=${del.status()}, masihDiDaftar=${stillListed}`);
    const after = await page.request.get(`${ep}/${c.id}`);
    if (after.status() !== 404) report.finding(`${tag} 1.1-D detail setelah delete (soft delete)`, `GET detail -> ${after.status()} ${(JSON.stringify((await json(after))?.data ?? '')).slice(0, 80)}`);
    const rest = created.filter((id) => id !== c.id);
    if (rest.length) await page.request.delete(ep, { data: { ids: rest } });
  }

  report.print();
});
