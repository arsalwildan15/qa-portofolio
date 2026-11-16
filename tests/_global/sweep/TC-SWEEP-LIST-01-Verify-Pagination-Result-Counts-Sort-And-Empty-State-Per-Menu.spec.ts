/**
 * ================================================================================
 * TC-SWEEP-LIST-01 — Verify Pagination, Result Counts, Sort Order And Empty State On Every Menu List API
 * Modul    : Semua menu ber-list (registry src/data/unitApiRegistry.ts)
 * Kategori : Boundary (B) 3.5 3.6 | Positive (+) 1.6 | Edge Case (!) 4.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-LIST-01-Verify-Pagination-Result-Counts-Sort-And-Empty-State-Per-Menu.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   Endpoint list per unit (inventaris API live). Per unit (label [U###]):
 *     3.6  limit=1 -> data berisi tepat min(1, total) baris; meta.total angka.
 *     3.5  halaman di luar range (offset = total + 10) -> data:[] (kosong), meta.total tetap.
 *     4.6  empty state: hasil kosong tsb punya data:[] (bukan null/error) -> UI dpt menampilkan
 *          "No Records Found".
 *     3.5  halaman ke-2 (offset=1, limit=1) -> bila total > 1, baris pertama BERBEDA dari
 *          halaman 1; bila total <= 1, dicatat finding (data tak cukup).
 *     1.6  sort: pada endpoint ber-sort, sortOrder=ASC vs DESC -> baris pertama berbeda bila
 *          total > 1 (urutan benar-benar terbalik di salah satu ujung).
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-LIST-01-Verify-Pagination-Result-Counts-Sort-And-Empty-State-Per-Menu.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { API_UNITS, withParam } from '../../../src/data/unitApiRegistry';

const API = '/web/index.php/api/v2/';

type ListBody = { data?: Array<Record<string, unknown>>; meta?: { total?: number } };
const idOf = (row: Record<string, unknown> | undefined) => (row?.['id'] ?? row?.['empNumber'] ?? JSON.stringify(row ?? {}));

test('TC-SWEEP-LIST-01: pagination, result counts, sort order and empty state on every menu list API', async ({ page }, testInfo) => {
  testInfo.setTimeout(API_UNITS.length * 20_000);
  const report = new TestReport('TC-SWEEP-LIST-01', 'Pagination Result Counts Sort And Empty State Per Menu', env.baseURL);

  const get = async (relList: string, params: Array<[string, string]>): Promise<ListBody> => {
    let path = relList;
    for (const [k, v] of params) path = withParam(path, k, v);
    return (await (await page.request.get(API + path)).json().catch(() => null)) as ListBody;
  };

  for (const u of API_UNITS) {
    const tag = `[${u.id} ${u.path}]`;
    report.step(`${tag} ${u.list}`);

    const one = await get(u.list, [['limit', '1'], ['offset', '0']]);
    const total = one?.meta?.total;
    report.check(`${tag} 3.6 / 6.6 limit=1 -> <=1 baris & meta.total angka`, Array.isArray(one?.data) && (one.data?.length ?? 0) <= 1 && typeof total === 'number', `rows=${one?.data?.length}, total=${JSON.stringify(total)}`);

    const beyond = await get(u.list, [['limit', '10'], ['offset', String((total ?? 0) + 10)]]);
    report.check(`${tag} 3.5/4.6 / 6.6 Halaman di luar range (offset) -> data:[] kosong`, Array.isArray(beyond?.data) && (beyond.data?.length ?? -1) === 0, `rows=${beyond?.data?.length}`);
    report.check(`${tag} 4.6 Empty state terkendali (array, bukan null/error)`, Array.isArray(beyond?.data) && typeof beyond?.meta?.total === 'number', `data=${Array.isArray(beyond?.data)}`);

    if ((total ?? 0) > 1) {
      const p2 = await get(u.list, [['limit', '1'], ['offset', '1']]);
      report.check(`${tag} 3.5 / 6.6 Halaman 2 (offset=1) baris berbeda dari halaman 1`, idOf(p2?.data?.[0]) !== idOf(one?.data?.[0]), `p1=${idOf(one?.data?.[0])}, p2=${idOf(p2?.data?.[0])}`);
    } else {
      report.finding(`${tag} 3.5 pagination tidak teruji`, `total=${total} <= 1`);
    }

    if (u.sorted && (total ?? 0) > 1) {
      const asc = await get(u.list, [['limit', '50'], ['offset', '0'], ['sortOrder', 'ASC']]);
      const desc = await get(u.list, [['limit', '50'], ['offset', '0'], ['sortOrder', 'DESC']]);
      report.check(`${tag} 1.6 / 6.6 Sort ASC vs DESC (sortOrder) membalik urutan (baris pertama berbeda)`, idOf(asc?.data?.[0]) !== idOf(desc?.data?.[0]), `asc=${idOf(asc?.data?.[0])}, desc=${idOf(desc?.data?.[0])}`);
    } else if (u.sorted) {
      report.finding(`${tag} 1.6 sort tidak teruji`, `total=${total} <= 1`);
    }
  }

  report.print();
});
