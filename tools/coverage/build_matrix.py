"""Coverage matrix: unit x Test-Case-Taxonomy item.
Inputs : specs.json (extract_specs.py), units.json (live inventory)
Outputs: matrix.json + Taxonomy-Coverage-Matrix.md
Method : (1) each spec -> units (folder map + literal goto URLs) ; (2) each spec -> taxonomy codes by
explicit keyword rules over file name + Kategori + check labels ; (3) each unit -> applicable items by
explicit unit flags (reason recorded for every N/A) ; (4) cell = COVERED (TC ids) / N/A (reason) / GAP.
"""
import json, re, sys
from collections import defaultdict

S = sys.argv[1]
OUT_MD = sys.argv[2]
specs = json.load(open(S + '/specs.json', encoding='utf-8'))
# SCOPE (instruksi user 2026-11-15): HANYA 12 modul sidebar (Admin, PIM, Leave, Time, Recruitment,
# My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) + kotak Search sidebar.
# Login & item header (About/Support/Change Password/Help/Upgrade) bukan menu sidebar -> di luar matrix
# (TC Login yg ada tetap dipertahankan & dijalankan, hanya tidak dihitung di matrix menu).
SCOPE_MODULES = {'Admin', 'PIM', 'Leave', 'Time', 'Recruitment', 'My Info', 'Performance', 'Dashboard',
                 'Directory', 'Maintenance', 'Claim', 'Buzz', 'Sidebar'}
ALL_UNITS = {u['id']: u for u in json.load(open(S + '/units.json', encoding='utf-8'))}
units = {k: u for k, u in ALL_UNITS.items() if u['path'].split(' > ')[0] in SCOPE_MODULES}
by_path = {u['path']: uid for uid, u in ALL_UNITS.items()}
U = lambda p: by_path[p]

# ---------------------------------------------------------------- 1. spec -> units
SWEEP_UNITS = set(json.load(open(S + '/sweep_units.json')))
DIR = {
 'admin/users': ['Admin > User Management > Users'], 'admin/job-titles': ['Admin > Job > Job Titles'],
 'admin/pay-grades': ['Admin > Job > Pay Grades'], 'admin/employment-status': ['Admin > Job > Employment Status'],
 'admin/job-categories': ['Admin > Job > Job Categories'], 'admin/work-shifts': ['Admin > Job > Work Shifts'],
 'admin/general-information': ['Admin > Organization > General Information'], 'admin/locations': ['Admin > Organization > Locations'],
 'admin/structure': ['Admin > Organization > Structure'], 'admin/skills': ['Admin > Qualifications > Skills'],
 'admin/education': ['Admin > Qualifications > Education'], 'admin/licenses': ['Admin > Qualifications > Licenses'],
 'admin/languages': ['Admin > Qualifications > Languages'], 'admin/memberships': ['Admin > Qualifications > Memberships'],
 'admin/nationalities': ['Admin > Nationalities'], 'admin/corporate-branding': ['Admin > Corporate Branding'],
 'admin/email-configuration': ['Admin > Configuration > Email Configuration'], 'admin/email-subscriptions': ['Admin > Configuration > Email Subscriptions'],
 'admin/localization': ['Admin > Configuration > Localization'], 'admin/language-packages': ['Admin > Configuration > Language Packages'],
 'admin/modules': ['Admin > Configuration > Modules'], 'admin/social-media-authentication': ['Admin > Configuration > Social Media Authentication'],
 'admin/oauth-client': ['Admin > Configuration > Register OAuth Client'], 'admin/ldap-configuration': ['Admin > Configuration > LDAP Configuration'],
 'pim/employee-list': ['PIM > Employee List'], 'pim/add-employee': ['PIM > Add Employee'], 'pim/reports': ['PIM > Reports'],
 'pim/configuration/optional-fields': ['PIM > Configuration > Optional Fields'], 'pim/configuration/custom-fields': ['PIM > Configuration > Custom Fields'],
 'pim/configuration/data-import': ['PIM > Configuration > Data Import'], 'pim/configuration/reporting-methods': ['PIM > Configuration > Reporting Methods'],
 'pim/configuration/termination-reasons': ['PIM > Configuration > Termination Reasons'],
 'pim/personal-details': ['PIM > Employee > Personal Details'], 'pim/contact-details': ['PIM > Employee > Contact Details'],
 'pim/emergency-contacts': ['PIM > Employee > Emergency Contacts'], 'pim/dependents': ['PIM > Employee > Dependents'],
 'pim/immigration': ['PIM > Employee > Immigration'], 'pim/job': ['PIM > Employee > Job'], 'pim/salary': ['PIM > Employee > Salary'],
 'pim/report-to': ['PIM > Employee > Report-to'], 'pim/qualifications': ['PIM > Employee > Qualifications'], 'pim/memberships': ['PIM > Employee > Memberships'],
 'leave/apply': ['Leave > Apply'], 'leave/approval': ['Leave > Leave List', 'Leave > My Leave'], 'leave/assign': ['Leave > Assign Leave'],
 'leave/entitlements': ['Leave > Entitlements > Add Entitlements', 'Leave > Entitlements > My Entitlements'], 'leave/leave-list': ['Leave > Leave List'],
 'leave/my-leave': ['Leave > My Leave'],
 'time/project': ['Time > Project Info > Customers', 'Time > Project Info > Projects'],
 'recruitment/candidates': ['Recruitment > Candidates'], 'recruitment/status-workflow': ['Recruitment > Candidate Detail & Status Workflow'],
 'recruitment/vacancies': ['Recruitment > Vacancies'],
 'performance/kpi': ['Performance > Configure > KPIs'], 'performance/review': ['Performance > Manage Reviews > Manage Reviews'],
 'claim/approval': ['Claim > Employee Claims', 'Claim > Claim Detail (expenses, attachments, actions)'],
 'claim/assign': ['Claim > Assign Claim', 'Claim > Claim Detail (expenses, attachments, actions)'],
 'claim/submit': ['Claim > Submit Claim', 'Claim > My Claims'], 'buzz': ['Buzz'],
}
NAME_RULES = [  # (regex on path, units) for folders whose specs split across units
 (r'time/attendance/TC-TIME-PUNCH', ['Time > Attendance > Punch In/Out', 'Time > Attendance > My Records']),
 (r'time/attendance/TC-TIME-ADMIN-ATTENDANCE', ['Time > Attendance > Employee Records']),
 (r'time/attendance/TC-TIME-REPORTS', ['Time > Reports > Employee Reports']),
 (r'time/timesheet/TC-TIME-TS-APPROVAL', ['Time > Timesheets > Employee Timesheets', 'Time > Timesheet Edit & Approval']),
 (r'time/timesheet/TC-TIME-(TIMESHEET|TS-SUBMIT)', ['Time > Timesheets > My Timesheets', 'Time > Timesheet Edit & Approval']),
 (r'performance/evaluate/TC-PERF-EVAL-1[06]', ['Performance > Self Evaluation (ESS)', 'Performance > Manage Reviews > My Reviews']),
 (r'performance/evaluate/', ['Performance > Review Evaluation (Admin/Supervisor)']),
 (r'performance/tracker/TC-PERF-TRACKER-0[1-4]', ['Performance > Configure > Trackers']),
 (r'performance/tracker/TC-PERF-TRACKER-0[56]', ['Performance > Tracker Logs', 'Performance > My Trackers', 'Performance > Employee Trackers']),
 (r'performance/tracker/TC-PERF-TRACKER-07', ['Performance > Tracker Logs', 'Performance > My Trackers']),
 (r'claim/config/TC-CLAIM-CONFIG-EVENT', ['Claim > Configuration > Events']),
 (r'claim/config/TC-CLAIM-CONFIG-EXPTYPE', ['Claim > Configuration > Expense Types']),
 (r'_global/login/', ['Login > Login Page']),
 (r'_global/sidebar-search/', ['Sidebar > Search & Collapse']),
 (r'dashboard/widgets/', ['Dashboard > Widgets (Time at Work, My Actions, Quick Launch, Buzz, Leave Today, Distribution charts)', 'Dashboard']),
 (r'infra/TC-INFRA-01', ['PIM > Add Employee']), (r'infra/TC-INFRA-02', ['Admin > User Management > Users']), (r'infra/TC-INFRA-03', ['PIM > Employee > Report-to']),
 (r'cross-module/TC-XMOD-01', ['Leave > Leave List', 'Claim > Employee Claims', 'Performance > Configure > KPIs', 'Time > Timesheets > Employee Timesheets', 'Leave > Configure > Leave Types', 'Claim > Configuration > Events', 'Time > Project Info > Projects']),
 (r'cross-module/TC-XMOD-0[24]', ['Leave > Configure > Leave Types', 'Claim > Configuration > Events', 'Performance > Configure > KPIs', 'Time > Project Info > Customers']),
 (r'cross-module/TC-XMOD-03', ['Leave > Leave List', 'Claim > Employee Claims', 'Performance > Configure > KPIs', 'Time > Project Info > Projects']),
 (r'pim/security/TC-PIM-API-', ['PIM > Employee > Personal Details', 'PIM > Employee > Contact Details', 'PIM > Employee > Emergency Contacts',
                               'PIM > Employee > Dependents', 'PIM > Employee > Immigration', 'PIM > Employee > Job', 'PIM > Employee > Salary',
                               'PIM > Employee > Report-to', 'PIM > Employee > Qualifications', 'PIM > Employee > Memberships',
                               'PIM > Employee > Attachments (all tabs)']),
 (r'pim/security/TC-PIM-MUT-', ['PIM > Employee > Emergency Contacts', 'PIM > Employee > Dependents', 'PIM > Employee > Immigration',
                               'PIM > Employee > Salary', 'PIM > Employee > Qualifications', 'PIM > Employee > Memberships']),
 (r'my-info/.*/TC-MYINFO-IMMIGRATION-', ['My Info > Immigration']),
 (r'my-info/.*/TC-MYINFO-QUALIFICATION-', ['My Info > Qualifications']),
 (r'my-info/personal-details', ['My Info > Personal Details']),
 (r'my-info/contact-details', ['My Info > Contact Details']),
 (r'my-info/job-salary-report-to', ['My Info > Job', 'My Info > Salary', 'My Info > Report-to']),
 (r'my-info/records', ['My Info > Emergency Contacts', 'My Info > Dependents', 'My Info > Memberships', 'My Info > Attachments & Profile Picture']),
 (r'my-info/security/TC-MYINFO-API-', ['My Info > Personal Details', 'My Info > Contact Details', 'My Info > Emergency Contacts', 'My Info > Dependents',
                                     'My Info > Immigration', 'My Info > Job', 'My Info > Salary', 'My Info > Report-to', 'My Info > Qualifications',
                                     'My Info > Memberships', 'My Info > Attachments & Profile Picture']),
 # CSRF-01: the forged requests target the writable tabs; the session-cookie checks hold for every tab that saves data.
 (r'my-info/security/TC-MYINFO-CSRF-', ['My Info > Personal Details', 'My Info > Contact Details', 'My Info > Emergency Contacts', 'My Info > Dependents',
                                      'My Info > Immigration', 'My Info > Qualifications', 'My Info > Memberships', 'My Info > Attachments & Profile Picture']),
 # IDOR-01 requests the victim's data on 12 tabs (personal, contact, emergency, dependents, immigration, job,
 # salary, supervisors, skills, memberships, custom fields, attachments) -- each one is a 5.2-IDOR check.
 (r'my-info/security/TC-MYINFO-IDOR-', ['My Info > Personal Details', 'My Info > Contact Details', 'My Info > Emergency Contacts', 'My Info > Dependents',
                                      'My Info > Immigration', 'My Info > Job', 'My Info > Salary', 'My Info > Report-to', 'My Info > Qualifications',
                                      'My Info > Memberships', 'My Info > Attachments & Profile Picture']),
 (r'my-info/security', ['My Info > Personal Details', 'My Info > Contact Details', 'My Info > Emergency Contacts']),
 (r'sweep/TC-SWEEP-LIST', [u['path'] for u in json.load(open(S + '/units.json', encoding='utf-8')) if u['id'] in set(json.load(open(S + '/api_units.json')))]),
 (r'sweep/TC-SWEEP-(UIMUT|MUT|CONC)-', [u['path'] for u in json.load(open(S + '/units.json', encoding='utf-8'))
                         if u['id'] in set(re.findall(r"'(U\d{3})'", open('src/data/unitMutationRegistry.ts', encoding='utf-8').read()))]),
 (r'sweep/TC-SWEEP-API', [u['path'] for u in json.load(open(S + '/units.json', encoding='utf-8'))
                         if u['id'] in set(json.load(open(S + '/api_units.json')))]),
 (r'sweep/TC-SWEEP-(PAGE|HDR|ROLE|VIEW|A11Y|XBROWSER)', [u['path'] for u in json.load(open(S + '/units.json', encoding='utf-8'))
                                  if u['id'] in SWEEP_UNITS]),
 (r'cross-module/TC-XMOD-0[56]', ['Claim > Configuration > Events', 'Leave > Configure > Leave Types', 'Time > Project Info > Customers']),
]
URL_UNITS = sorted(((u['url'], uid) for uid, u in units.items() if u['url'] and '(' not in u['url'] and '<' not in u['url']), key=lambda x: -len(x[0]))

def spec_units(sp):
    p = sp['path']
    out = set()
    for pat, names in NAME_RULES:
        if re.search(pat, p):
            out |= {U(n) for n in names}; break
    if not out:
        for d, names in DIR.items():
            if p.startswith('tests/' + d + '/'):
                out |= {U(n) for n in names}; break
    low = (p + ' ' + sp['header']).lower()
    if p.startswith('tests/_global/login/'):
        if re.search(r'forgot|reset password|requestpasswordreset', low): out.add(U('Login > Forgot Password'))
        if re.search(r'logout|session', low): out.add(U('Login > Logout & Session'))
    if p.startswith('tests/pim/') and re.search(r'attachment', p.lower()): out.add(U('PIM > Employee > Attachments (all tabs)'))
    if p.startswith('tests/pim/') and re.search(r'photo|picture', p.lower()): out.add(U('PIM > Employee > Profile Picture'))
    if p.startswith('tests/recruitment/candidates/') and re.search(r'status|detail|shortlist|interview', p.lower()): out.add(U('Recruitment > Candidate Detail & Status Workflow'))
    if p.startswith('tests/recruitment/vacancies/') and re.search(r'attachment|detail|edit|deactivate', p.lower()): out.add(U('Recruitment > Vacancy Detail & Attachments'))
    # The sidebar is tested while standing on the Dashboard; that page is only the host, not under test.
    for g in ([] if p.startswith('tests/_global/sidebar-search/') else sp['gotos']):
        path = g.split('/web/index.php/')[-1].split('?')[0]
        for url, uid in URL_UNITS:
            if path == url or path == url.rstrip('#'):
                out.add(uid); break
    if not out and p.startswith('tests/pim/security'): out.add(U('PIM > Employee List'))
    if not out and p.startswith('tests/admin/security'): out.add(U('Admin > User Management > Users'))
    if not out and p.startswith('tests/recruitment/security'): out.add(U('Recruitment > Candidates'))
    return sorted(out)

# ---------------------------------------------------------------- 2. spec -> taxonomy codes
R = [  # (code, regex) applied to file name + Kategori + check labels (lowercased)
 ('1.1-C', r'\badd\b|create|-add-|valid-(record|dependent|membership|contact)|punch-in|apply|submit|assign'),
 ('1.1-R', r'\blist\b|search|view|-read|filter|report shows|appears|muncul di daftar|tampil di daftar'),
 ('1.1-U', r'\bedit\b|update|rename|-edit-|change'),
 ('1.1-D', r'delete|remove|hapus'),
 ('1.2', r'optional|opsional|without optional|tanpa (field )?opsional'),
 ('1.3', r'approve|activate|transition|shortlist|interview|terminate|reactivat|complete|scheduled|paid|status-workflow|resubmit|offer|hire|cancel (claim|leave|request|submitted)|cancel-submitted|own-cancel|enable|disable'),
 ('1.4', r'available to|offered|dropdown|scoped|reflect|linked|cascade|relation|in candidate dropdown|visible to|appears in|assign supervisor|report-to'),
 ('1.5', r'ess (can|bisa)|own (claim|leave|timesheet|tracker)|as ess|ess fill|ess create|ess adds|self-evaluation|my leave|my claims'),
 ('1.6', r'search|filter|sort'),
 ('1.7', r'upload|attachment|resume|import|logo|banner|photo|picture'),
 ('1.8', r'toast|successfully|success message|pesan sukses'),
 ('2.1', r'required'),
 ('2.2', r'invalid[- ](date|format|email|phone)|format|non-numeric|negative|malformed|abc|not a number|invalid-'),
 ('2.3', r'duplicate|unique|already exists'),
 ('2.4', r'cannot|403|unauthori|forbidden|access control|credential required|tidak boleh'),
 ('2.5', r'unsubmitted|after (approve|cancel|reject|activation)|terminal|cancelled|inactive review|stale|blocked after|not allowed|edit-blocked|already'),
 ('2.6', r'invalid[- ]id|non-?existent|not exist|999999|handled safely|deleted record|invalid kpi'),
 ('2.7', r'wrong password|invalid credential|incorrect|disabled account|empty (username|password)|invalid username|invalid password'),
 ('2.8', r'without comment|tanpa komentar|reject reason|no reason'),
 ('3.1', r'long text|max(imum)? length|very long|length|255|characters|karakter|exceed|char-'),
 ('3.2', r'\bmin\b|\bmax\b|zero|negative|amount|rating|positions|number-of|numeric|duration|entitlement|0\.5|25:00|>24'),
 ('3.3', r'1mb|size|oversize|exact-1mb|over-1mb|over 1'),
 ('3.4', r'date|future|past|leap|year|joined|birth|period'),
 ('3.5', r'pagination|page 2|halaman 2|offset'),
 ('3.6', r'no records|empty|zero result|kosong'),
 ('4.1', r'unicode|emoji|rtl|whitespace|multi-?line|arabic|special char'),
 ('4.2', r'double|twice|rapid|klik ganda'),
 ('4.3', r'back[/-]forward|browser back|refresh|reload|new tab|cancel-discards|cancel discards|discard'),
 ('4.4', r'race|concurrent|parallel|bersamaan'),
 ('4.5', r'connection|network|session timeout|expired|drop|koneksi'),
 ('4.6', r'empty state|null'),
 ('4.7', r'two admins|multi-user|concurrent edit|last-write|second admin'),
 ('4.8', r'documented|behavior|behaviour|finding|temuan|by design|desain'),
 ('5.1-SQLi', r'sql'), ('5.1-XSS-Stored', r'xss'), ('5.1-XSS-Reflected', r'reflected|query param'),
 ('5.1-CmdPath', r'path traversal|command injection|\.\./'), ('5.1-SSRF', r'ssrf'),
 ('5.2-IDOR', r'idor|other employee|another employee|cross-employee|orang lain'),
 ('5.2-BFLAC', r'function level|ess cannot|via api.*ess|ess.*via api|admin-only|bflac|ess-cannot'),
 ('5.2-PrivEsc', r'privilege|escalat|own role|change own'),
 ('5.2-MassAssign', r'mass assign|mass-assign|extra field|field ekstra'),
 ('5.2-OpenRedirect', r'redirect'),
 ('5.3-BadExt', r'\.exe|\.php|executable|pure-exe|wrong-file-type|bad ext|extension'),
 ('5.3-Rename', r'renamed|rename.*(jpg|pdf)|exe-renamed|bypass'),
 ('5.3-ContentType', r'content-type|mime'), ('5.3-DoubleExt', r'double ext|double-ext'),
 ('5.3-Oversize', r'1mb|oversize|over-1mb'), ('5.3-Filename', r'filename|file name'),
 ('5.4', r'csrf|cross-origin|cross-site'),
 ('5.5', r'brute|rate limit|lockout|spam|rate-limit'),
 ('5.6', r'clickjack|header|x-frame|hsts|csp'),
 ('5.7', r'session fixation|logout|session id|cookie|session'),
 ('5.8', r'sensitive|leak|password hash|expos|stack trace|error detail|disclos'),
 ('5.9', r'bypass|business logic|skip|manipulat|self-approv|own claim|own timesheet|cannot approve own|segregation|without expense'),
 ('6.1', r'\[api\]|status|422|400|404|500|200'),
 ('6.2', r'schema|contract|response body punya|data\.id|field.*(ada|exist)'),
 ('6.3', r'method|405'), ('6.4', r'without (token|session|login)|unauthenticated|no session|401'),
 ('6.5', r'api-negative|negative post|null|empty body|body kosong|tipe salah|extra field'),
 ('6.6', r'limit=|offset|sortfield|sortorder|paging'), ('6.7', r'idempot|exactly one|tepat satu|no duplicate|tidak duplikat|does-not-duplicate'),
 ('7.5', r'load time|performance|response time|lambat'),
 ('8.1', r'viewport|mobile|responsive'), ('8.3', r'aria|accessib|alt text|a11y'), ('8.4', r'consisten'),
]
WEAK_RX = re.compile(r'tanpa exception|without exception|dijalankan tanpa', re.I)
def is_weak(sp):
    """Vacuous TC: no check verifies an outcome (only 'ran without exception' or none at all)."""
    return len([c for c in sp['checks'] if not WEAK_RX.search(c)]) == 0

EXPLICIT_RX = re.compile(r'(?<![\d.])([1-8]\.\d(?:-[A-Za-z]+(?:-[A-Za-z]+)?)?)(?![\d.])')

def spec_codes(sp):
    if is_weak(sp):
        return []  # must not count as coverage; listed in the matrix as weak TCs to strengthen
    text = (sp['path'].split('/')[-1] + ' ' + sp['kategori'] + ' ' + ' '.join(sp['checks']) + ' ' + ' '.join(sp['findings'])).lower()
    # A spec whose check labels name their taxonomy codes (the convention since 2026-11-16) is tagged
    # ONLY with those codes: keyword rules misfire on plain words such as "hapus query" (-> 1.1-D) or
    # "sesi" (-> 5.7) in such labels. Older specs keep the keyword pass.
    explicit = [c for c in sp['checks'] if EXPLICIT_RX.search(c)]
    # A curated header (tools/coverage/apply_codes.py) also switches the spec to explicit mode: its
    # 'Kategori' line names the codes ("Negative (-) 2.1 | Boundary (B) 3.1") or "kode: -" for none.
    kat_codes = set(EXPLICIT_RX.findall(sp['kategori']))
    kat_explicit = bool(kat_codes) or 'kode: -' in sp['kategori']
    labels_explicit = bool(sp['checks']) and len(explicit) >= 0.8 * len(sp['checks'])
    codes = set(kat_codes) if (kat_explicit or labels_explicit) else {c for c, rx in R if re.search(rx, text)}
    # Explicit convention (sweep TCs and every TC written from now on): a check/finding label that
    # names its taxonomy code, e.g. "[U093 ...] 7.2 ..." or "5.2-IDOR ...", is tagged with it directly.
    for label in sp['checks'] + sp['findings']:
        for code in EXPLICIT_RX.findall(label):
            codes.add(code)
    codes |= {'7.1', '7.2', '7.3'}  # every TestReport runs the automatic console/failed-resource check
    return sorted(codes)

tags = []
for sp in specs:
    tags.append({'tc': sp['tc'], 'path': sp['path'], 'units': spec_units(sp), 'codes': spec_codes(sp), 'weak': is_weak(sp),
                 'intentionalFail': sp['intentionalFail'], 'bugs': sp['bugs']})
json.dump(tags, open(S + '/tags.json', 'w', encoding='utf-8'), indent=0)

# ---------------------------------------------------------------- 3. unit flags -> applicable items
# flags: L list | C create | E edit | D delete | T free text | N numeric | DT date | UP upload | W workflow
#        RJ reject action | ID id-keyed | AO admin-only | ESS ess-facing | URL url field | UQ unique name
#        SR search box | PII sensitive data | LOG login | RO read-only | SET single settings form | EXP export/import path
F = defaultdict(set)
def flag(paths, *fl):
    for p in paths:
        if U(p) in units: F[U(p)] |= set(fl)
ADMIN_LISTS = ['Admin > Job > Job Titles', 'Admin > Job > Pay Grades', 'Admin > Job > Employment Status', 'Admin > Job > Job Categories',
               'Admin > Job > Work Shifts', 'Admin > Organization > Locations', 'Admin > Qualifications > Skills', 'Admin > Qualifications > Education',
               'Admin > Qualifications > Licenses', 'Admin > Qualifications > Languages', 'Admin > Qualifications > Memberships', 'Admin > Nationalities',
               'Admin > Configuration > Language Packages', 'Admin > Configuration > Social Media Authentication', 'Admin > Configuration > Register OAuth Client',
               'PIM > Configuration > Custom Fields', 'PIM > Configuration > Reporting Methods', 'PIM > Configuration > Termination Reasons',
               'Leave > Configure > Leave Types', 'Leave > Configure > Holidays', 'Time > Project Info > Customers', 'Time > Project Info > Projects',
               'Performance > Configure > KPIs', 'Performance > Configure > Trackers', 'Claim > Configuration > Events', 'Claim > Configuration > Expense Types']
flag(ADMIN_LISTS, 'L', 'C', 'E', 'D', 'T', 'ID', 'AO', 'UQ')
flag(['Admin > User Management > Users'], 'L', 'C', 'E', 'D', 'T', 'ID', 'AO', 'UQ', 'SR', 'PII', 'W')
flag(['Admin > Organization > Structure'], 'C', 'E', 'D', 'T', 'ID', 'AO', 'UQ')
SETTINGS = ['Admin > Organization > General Information', 'Admin > Configuration > Email Configuration', 'Admin > Configuration > Email Subscriptions',
            'Admin > Configuration > Localization', 'Admin > Configuration > Modules', 'Admin > Configuration > LDAP Configuration',
            'PIM > Configuration > Optional Fields', 'Leave > Configure > Leave Period', 'Leave > Configure > Work Week', 'Time > Attendance > Configuration',
            'Admin > Corporate Branding']
flag(SETTINGS, 'SET', 'E', 'AO')
flag(['Admin > Organization > General Information', 'Admin > Configuration > Email Configuration', 'Admin > Configuration > LDAP Configuration'], 'T')
flag(['Admin > Configuration > Email Configuration', 'Admin > Configuration > LDAP Configuration', 'Admin > Configuration > Social Media Authentication', 'Admin > Configuration > Register OAuth Client'], 'URL')
flag(['Admin > Corporate Branding', 'PIM > Configuration > Data Import', 'PIM > Employee > Attachments (all tabs)', 'PIM > Employee > Profile Picture',
      'Recruitment > Candidates', 'Recruitment > Vacancy Detail & Attachments', 'Claim > Claim Detail (expenses, attachments, actions)', 'PIM > Add Employee',
      'Recruitment > Candidate Detail & Status Workflow'], 'UP')
flag(['PIM > Configuration > Data Import'], 'C', 'AO', 'EXP')
flag(['Admin > Configuration > Language Packages', 'PIM > Reports'], 'EXP')
flag(['PIM > Employee List'], 'L', 'D', 'SR', 'ID', 'PII', 'AO')
flag(['PIM > Add Employee'], 'C', 'T', 'UQ', 'AO', 'PII')
flag(['PIM > Reports'], 'L', 'C', 'E', 'D', 'T', 'AO', 'ID', 'UQ', 'SR')
EMP_TABS = ['PIM > Employee > Personal Details', 'PIM > Employee > Contact Details', 'PIM > Employee > Emergency Contacts', 'PIM > Employee > Dependents',
            'PIM > Employee > Immigration', 'PIM > Employee > Job', 'PIM > Employee > Salary', 'PIM > Employee > Report-to', 'PIM > Employee > Qualifications',
            'PIM > Employee > Memberships', 'My Info > Personal Details']
flag(EMP_TABS, 'E', 'T', 'ID', 'PII', 'ESS')
flag(['PIM > Employee > Emergency Contacts', 'PIM > Employee > Dependents', 'PIM > Employee > Immigration', 'PIM > Employee > Salary',
      'PIM > Employee > Report-to', 'PIM > Employee > Qualifications', 'PIM > Employee > Memberships', 'PIM > Employee > Attachments (all tabs)'], 'L', 'C', 'D')
flag(['PIM > Employee > Personal Details', 'PIM > Employee > Dependents', 'PIM > Employee > Immigration', 'PIM > Employee > Job', 'PIM > Employee > Qualifications',
      'PIM > Employee > Memberships', 'My Info > Personal Details'], 'DT')
flag(['PIM > Employee > Salary', 'PIM > Employee > Memberships', 'Admin > Job > Pay Grades'], 'N')
flag(['PIM > Employee > Job'], 'W', 'AO')
flag(['PIM > Employee > Salary'], 'AO')
flag(['PIM > Employee > Attachments (all tabs)', 'PIM > Employee > Profile Picture'], 'ID', 'ESS', 'E')
MYINFO_EDIT = ['My Info > Contact Details', 'My Info > Emergency Contacts', 'My Info > Dependents', 'My Info > Immigration',
               'My Info > Qualifications', 'My Info > Memberships', 'My Info > Attachments & Profile Picture']
flag(MYINFO_EDIT, 'E', 'T', 'ID', 'PII', 'ESS')
flag(['My Info > Emergency Contacts', 'My Info > Dependents', 'My Info > Immigration', 'My Info > Qualifications',
      'My Info > Memberships', 'My Info > Attachments & Profile Picture'], 'L', 'C', 'D')
flag(['My Info > Dependents', 'My Info > Immigration', 'My Info > Qualifications', 'My Info > Memberships'], 'DT')
flag(['My Info > Memberships'], 'N')
flag(['My Info > Attachments & Profile Picture'], 'UP')
# PE = privilege boundary: shown to the employee but must stay read-only for ESS (edit only by Admin).
flag(['My Info > Job', 'My Info > Salary', 'My Info > Report-to'], 'RO', 'ESS', 'ID', 'PII', 'PE', 'L')
flag(['My Info > Personal Details'], 'PE')
flag(['Leave > Leave List'], 'L', 'W', 'RJ', 'ID', 'SR', 'DT', 'AO')
flag(['Leave > My Leave', 'Leave > Apply'], 'ESS', 'W', 'DT', 'T', 'ID')
flag(['Leave > Apply', 'Leave > Assign Leave'], 'C', 'N')
flag(['Leave > My Leave'], 'L', 'SR')
flag(['Leave > Assign Leave'], 'DT', 'T', 'AO')
flag(['Leave > Entitlements > Add Entitlements', 'Leave > Entitlements > Employee Entitlements'], 'C', 'E', 'D', 'N', 'AO', 'ID', 'L', 'DT')
flag(['Leave > Entitlements > My Entitlements', 'Leave > Reports > My Leave Entitlements and Usage Report'], 'RO', 'ESS', 'L', 'ID')
flag(['Leave > Reports > Leave Entitlements and Usage Report', 'Time > Reports > Project Reports', 'Time > Reports > Employee Reports',
      'Time > Reports > Attendance Summary'], 'RO', 'AO', 'L', 'SR', 'DT')
flag(['Leave > Configure > Holidays'], 'DT')
flag(['Time > Timesheets > Employee Timesheets'], 'L', 'W', 'RJ', 'AO', 'SR', 'ID')
flag(['Time > Timesheets > My Timesheets', 'Time > Timesheet Edit & Approval'], 'E', 'W', 'N', 'T', 'ESS', 'ID', 'DT')
flag(['Time > Timesheet Edit & Approval'], 'RJ')
flag(['Time > Attendance > Punch In/Out'], 'C', 'W', 'T', 'DT', 'ESS')
flag(['Time > Attendance > My Records'], 'L', 'D', 'E', 'ESS', 'DT', 'ID')
flag(['Time > Attendance > Employee Records'], 'L', 'C', 'E', 'D', 'AO', 'SR', 'DT', 'ID')
flag(['Recruitment > Candidates'], 'L', 'C', 'D', 'T', 'SR', 'ID', 'PII', 'AO', 'DT')
flag(['Recruitment > Candidate Detail & Status Workflow'], 'E', 'W', 'RJ', 'T', 'ID', 'PII', 'AO', 'DT')
flag(['Recruitment > Vacancies'], 'L', 'C', 'D', 'T', 'SR', 'ID', 'N', 'AO', 'UQ')
flag(['Recruitment > Vacancy Detail & Attachments'], 'E', 'T', 'ID', 'W', 'AO', 'N')
flag(['Performance > Manage Reviews > Manage Reviews', 'Performance > Manage Reviews > Employee Reviews'], 'L', 'C', 'E', 'D', 'W', 'SR', 'ID', 'AO', 'DT')
flag(['Performance > Manage Reviews > My Reviews', 'Performance > My Trackers'], 'L', 'ESS', 'ID')
flag(['Performance > Employee Trackers'], 'L', 'SR', 'ID')
flag(['Performance > Review Evaluation (Admin/Supervisor)', 'Performance > Self Evaluation (ESS)'], 'E', 'W', 'N', 'T', 'ID', 'DT')
flag(['Performance > Self Evaluation (ESS)'], 'ESS')
flag(['Performance > Tracker Logs'], 'C', 'E', 'D', 'T', 'ID', 'ESS', 'L')
flag(['Performance > Configure > KPIs'], 'N')
flag(['Claim > Employee Claims'], 'L', 'SR', 'W', 'RJ', 'ID', 'AO', 'DT')
flag(['Claim > Submit Claim', 'Claim > Assign Claim'], 'C', 'T', 'W')
flag(['Claim > Submit Claim', 'Claim > My Claims'], 'ESS')
flag(['Claim > Assign Claim'], 'AO')
flag(['Claim > My Claims'], 'L', 'SR', 'ID', 'DT')
flag(['Claim > Claim Detail (expenses, attachments, actions)'], 'E', 'C', 'D', 'N', 'T', 'W', 'RJ', 'ID', 'DT', 'ESS')
flag(['Buzz'], 'L', 'C', 'E', 'D', 'T', 'ID', 'ESS', 'UP', 'URL')
flag(['Directory'], 'RO', 'L', 'SR', 'ESS', 'PII')
flag(['Dashboard', 'Dashboard > Widgets (Time at Work, My Actions, Quick Launch, Buzz, Leave Today, Distribution charts)'], 'RO', 'ESS')
flag(['Maintenance > Purge Records > Employee Records', 'Maintenance > Purge Records > Candidate Records'], 'D', 'AO', 'SR', 'W', 'PII')
flag(['Maintenance > Access Records'], 'RO', 'AO', 'SR', 'PII', 'EXP')
flag(['Login > Login Page'], 'LOG', 'T', 'ESS')
flag(['Login > Forgot Password'], 'LOG', 'T', 'ESS')
flag(['Login > Logout & Session'], 'LOG', 'ESS')
flag(['Header > Change Password'], 'E', 'T', 'ESS', 'LOG')
flag(['Header > About', 'Header > Support', 'Header > Help (?)', 'Header > Upgrade', 'Sidebar > Search & Collapse'], 'RO', 'ESS')
flag(['Sidebar > Search & Collapse'], 'SR')
# NOAPI: the search box filters the menu in the browser -- typing sends NO request (proven by the
# TC-SIDEBAR-SEARCH-02 check "Filter berjalan di klien ... tanpa satu pun request", live 2026-11-16).
# Items that judge a server response (5.6 headers per document, 5.8 data in responses, 6.1-6.5) cannot apply.
flag(['Sidebar > Search & Collapse'], 'NOAPI')

ITEMS = [  # (code, label, rule -> (applicable, reason_if_not))
 ('1.1-C', 'Create valid', lambda f: ('C' in f, 'tidak ada aksi create di menu ini')),
 ('1.1-R', 'Read / list', lambda f: (True, '')),
 ('1.1-U', 'Update valid', lambda f: ('E' in f or 'SET' in f, 'tidak ada aksi edit di menu ini')),
 ('1.1-D', 'Delete valid', lambda f: ('D' in f, 'tidak ada aksi delete di menu ini')),
 ('1.2', 'Variasi input valid (opsional diisi/kosong)', lambda f: (bool({'C', 'E', 'SET'} & f), 'tidak ada form input')),
 ('1.3', 'State transition valid', lambda f: ('W' in f, 'tidak ada workflow status')),
 ('1.4', 'Relasi antar-entity', lambda f: (bool({'C', 'E', 'SET'} & f) and 'LOG' not in f, 'tidak membuat/mengubah data yg dipakai entity lain')),
 ('1.5', 'Permission/role positif', lambda f: (True, '')),
 ('1.6', 'Search/filter/sort valid', lambda f: ('L' in f or 'SR' in f, 'tidak ada list/pencarian')),
 ('1.7', 'Upload file valid', lambda f: ('UP' in f, 'tidak ada field upload')),
 ('1.8', 'Notifikasi/feedback UI', lambda f: (bool({'C', 'E', 'D', 'SET'} & f), 'tidak ada aksi mutasi yg memicu toast')),
 ('2.1', 'Required field kosong', lambda f: (bool({'C', 'E', 'SET', 'LOG'} & f), 'tidak ada form dgn field wajib')),
 ('2.2', 'Format salah', lambda f: (bool({'DT', 'N', 'URL', 'LOG'} & f) or ('T' in f and bool({'C', 'E'} & f)), 'tidak ada field berformat (tanggal/angka/email/url)')),
 ('2.3', 'Duplicate/unique conflict', lambda f: ('UQ' in f, 'tidak ada nilai yg wajib unik')),
 ('2.4', 'Aksi tanpa permission (UI/API)', lambda f: ('AO' in f or bool({'C', 'E', 'D'} & f), 'menu publik/read-only tanpa aksi terbatas')),
 ('2.5', 'State transition invalid', lambda f: ('W' in f, 'tidak ada workflow status')),
 ('2.6', 'Operasi pada record invalid/tak eksis', lambda f: ('ID' in f, 'tidak meng-key record by ID')),
 ('2.7', 'Kredensial/auth salah', lambda f: ('LOG' in f, 'bukan modul auth')),
 ('2.8', 'Reject/cancel tanpa alasan', lambda f: ('RJ' in f, 'tidak ada aksi reject/cancel beralasan')),
 ('3.1', 'Panjang karakter field', lambda f: ('T' in f, 'tidak ada field teks bebas')),
 ('3.2', 'Nilai numerik', lambda f: ('N' in f, 'tidak ada field numerik')),
 ('3.3', 'Ukuran file upload', lambda f: ('UP' in f, 'tidak ada field upload')),
 ('3.4', 'Tanggal', lambda f: ('DT' in f, 'tidak ada field/filter tanggal')),
 ('3.5', 'Pagination', lambda f: ('L' in f, 'tidak ada list')),
 ('3.6', 'Jumlah hasil (0/1/limit)', lambda f: ('L' in f or 'SR' in f, 'tidak ada list/pencarian')),
 ('4.1', 'Karakter tidak biasa (unicode/emoji/RTL/whitespace)', lambda f: ('T' in f or 'SR' in f, 'tidak ada input teks')),
 ('4.2', 'Aksi ganda/cepat (double submit)', lambda f: (bool({'C', 'E', 'D', 'SET', 'LOG'} & f), 'tidak ada aksi submit')),
 ('4.3', 'Navigasi tidak biasa (back/refresh/tab baru)', lambda f: (bool({'C', 'E', 'SET', 'LOG'} & f), 'tidak ada alur submit')),
 ('4.4', 'Race condition', lambda f: ('W' in f, 'tidak ada aksi mutually-exclusive')),
 ('4.5', 'Session/koneksi terputus', lambda f: (bool({'C', 'E', 'D', 'SET', 'LOG'} & f), 'tidak ada request mutasi')),
 ('4.6', 'Data kosong/null (empty state)', lambda f: (True, '')),
 ('4.7', 'Konkurensi multi-user edit', lambda f: ('E' in f or 'SET' in f, 'tidak ada record yg bisa diedit')),
 ('4.8', 'Behavior non-obvious terdokumentasi', lambda f: (True, '')),
 ('5.1-SQLi', 'SQL Injection', lambda f: ('T' in f or 'SR' in f, 'tidak ada input teks/pencarian')),
 ('5.1-XSS-Stored', 'Stored XSS', lambda f: ('T' in f and bool({'C', 'E'} & f), 'tidak ada teks yg disimpan')),
 ('5.1-XSS-Reflected', 'Reflected XSS', lambda f: ('SR' in f or 'LOG' in f, 'tidak ada input yg dipantulkan (search/param)')),
 ('5.1-CmdPath', 'Command/Path injection', lambda f: ('EXP' in f or 'UP' in f, 'tidak ada nama file/path')),
 ('5.1-SSRF', 'SSRF', lambda f: ('URL' in f, 'tidak ada field URL yg diproses server')),
 ('5.2-IDOR', 'IDOR', lambda f: ('ID' in f, 'tidak meng-key data by ID')),
 ('5.2-BFLAC', 'Broken function level access control', lambda f: ('AO' in f, 'menu tidak admin-only')),
 ('5.2-PrivEsc', 'Privilege escalation', lambda f: ('ESS' in f and bool({'E', 'PE'} & f), 'tidak ada data diri yg bisa diubah user non-admin')),
 ('5.2-MassAssign', 'Mass assignment', lambda f: (bool({'C', 'E', 'SET'} & f), 'tidak ada endpoint mutasi')),
 ('5.2-OpenRedirect', 'Open redirect', lambda f: ('LOG' in f, 'tidak ada parameter redirect')),
 ('5.3-BadExt', 'Upload ekstensi terlarang', lambda f: ('UP' in f, 'tidak ada upload')),
 ('5.3-Rename', 'Upload file di-rename', lambda f: ('UP' in f, 'tidak ada upload')),
 ('5.3-ContentType', 'Content-Type spoofing', lambda f: ('UP' in f, 'tidak ada upload')),
 ('5.3-DoubleExt', 'Double extension', lambda f: ('UP' in f, 'tidak ada upload')),
 ('5.3-Oversize', 'Oversized file', lambda f: ('UP' in f, 'tidak ada upload')),
 ('5.3-Filename', 'Malicious filename', lambda f: ('UP' in f, 'tidak ada upload')),
 ('5.4', 'CSRF', lambda f: (bool({'C', 'E', 'D', 'SET'} & f), 'tidak ada endpoint mutasi')),
 ('5.5', 'Rate limit / brute force / spam', lambda f: ('LOG' in f or 'C' in f, 'tidak ada login/create')),
 ('5.6', 'Security headers', lambda f: ('NOAPI' not in f, 'tidak ada request: filter di klien (TC-SIDEBAR-SEARCH-02)')),
 ('5.7', 'Session security', lambda f: ('LOG' in f, 'bukan alur sesi/auth')),
 ('5.8', 'Sensitive data exposure', lambda f: ('NOAPI' not in f, 'tidak ada request: filter di klien (TC-SIDEBAR-SEARCH-02)')),
 ('5.9', 'Business logic abuse', lambda f: ('W' in f or 'N' in f, 'tidak ada urutan proses/nilai sensitif')),
 ('6.1', 'Status code benar', lambda f: ('NOAPI' not in f, 'tidak ada request: filter di klien (TC-SIDEBAR-SEARCH-02)')),
 ('6.2', 'Response schema/contract', lambda f: ('NOAPI' not in f, 'tidak ada request: filter di klien (TC-SIDEBAR-SEARCH-02)')),
 ('6.3', 'Request method salah (405)', lambda f: ('NOAPI' not in f, 'tidak ada request: filter di klien (TC-SIDEBAR-SEARCH-02)')),
 ('6.4', 'Auth/token (tanpa sesi / sesi user lain)', lambda f: ('NOAPI' not in f, 'tidak ada request: filter di klien (TC-SIDEBAR-SEARCH-02)')),
 ('6.5', 'Parameter negatif (tipe salah/extra/null)', lambda f: (bool({'C', 'E', 'SET', 'SR', 'L'} & f) and 'NOAPI' not in f, 'tidak ada parameter input / tidak ada request')),
 ('6.6', 'Pagination & sorting param', lambda f: ('L' in f, 'tidak ada endpoint list')),
 ('6.7', 'Idempotency', lambda f: ('C' in f, 'tidak ada create')),
 ('7.1', 'JS console error', lambda f: (True, '')),
 ('7.2', 'Network anomali', lambda f: (True, '')),
 ('7.3', 'Resource 404', lambda f: (True, '')),
 ('7.4', 'Warning log', lambda f: (True, '')),
 ('7.5', 'Performance dasar', lambda f: (True, '')),
 ('8.1', 'Responsive/layout', lambda f: (True, '')),
 ('8.2', 'Cross-browser', lambda f: (True, '')),
 ('8.3', 'Accessibility dasar', lambda f: (True, '')),
 ('8.4', 'Konsistensi pesan', lambda f: (bool({'C', 'E', 'SET', 'LOG'} & f), 'tidak ada pesan validasi/feedback')),
]

cover = defaultdict(lambda: defaultdict(list))
for t in tags:
    for uid in t['units']:
        for c in t['codes']:
            cover[uid][c].append(t['tc'])

matrix = {}
totals = defaultdict(int)
for uid in sorted(units):
    f = F[uid]
    row = {}
    for code, label, rule in ITEMS:
        ok, why = rule(f)
        if not ok:
            row[code] = ('N/A', why); totals['N/A'] += 1
        elif cover[uid].get(code):
            row[code] = ('COVERED', ', '.join(sorted(set(cover[uid][code])))); totals['COVERED'] += 1
        else:
            row[code] = ('GAP', ''); totals['GAP'] += 1
    matrix[uid] = row
json.dump({'units': units, 'flags': {k: sorted(v) for k, v in F.items()}, 'matrix': matrix, 'items': [(c, l) for c, l, _ in ITEMS]},
          open(S + '/matrix.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
weak = [t['path'] for t in tags if t['weak']]
json.dump(weak, open(S + '/weak.json', 'w'), indent=0)
print('weak specs', len(weak))
unmapped = [t['path'] for t in tags if not t['units']]
print('totals', dict(totals), 'unmapped specs', len(unmapped), unmapped[:8])
no_flags = [units[u]['path'] for u in units if not F[u]]
print('units without flags', no_flags)
