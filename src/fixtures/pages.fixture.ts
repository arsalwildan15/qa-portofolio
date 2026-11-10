import { test as base } from '@playwright/test';
import { env } from '../config/env';
import {
  LoginPage,
  DashboardPage,
  PimPage,
  LeavePage,
  EmployeeListPage,
  AddEmployeePage,
  PersonalDetailsPage,
  ContactDetailsPage,
  JobPage,
  EmergencyContactsPage,
  DependentsPage,
  ImmigrationPage,
  SalaryPage,
  ReportToPage,
  QualificationsPage,
  MembershipsPage,
  OptionalFieldsPage,
  CustomFieldsPage,
  DataImportPage,
  ReportingMethodsPage,
  TerminationReasonsPage,
  PimReportsPage,
  VacanciesPage,
  CandidatesPage,
  AdminUsersPage,
  AdminJobTitlesPage,
  AdminWorkShiftsPage,
  AdminSimpleListPage,
  AdminCorporateBrandingPage,
  AdminGeneralInformationPage,
  AdminLocationsPage,
  AdminStructurePage,
  AdminEmailConfigurationPage,
  AdminEmailSubscriptionsPage,
  AdminLocalizationPage,
  AdminLanguagePackagesPage,
} from '../pages';

interface Pages {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  pimPage: PimPage;
  leavePage: LeavePage;
  employeeListPage: EmployeeListPage;
  addEmployeePage: AddEmployeePage;
  personalDetailsPage: PersonalDetailsPage;
  contactDetailsPage: ContactDetailsPage;
  jobPage: JobPage;
  emergencyContactsPage: EmergencyContactsPage;
  dependentsPage: DependentsPage;
  immigrationPage: ImmigrationPage;
  salaryPage: SalaryPage;
  reportToPage: ReportToPage;
  qualificationsPage: QualificationsPage;
  membershipsPage: MembershipsPage;
  optionalFieldsPage: OptionalFieldsPage;
  customFieldsPage: CustomFieldsPage;
  dataImportPage: DataImportPage;
  reportingMethodsPage: ReportingMethodsPage;
  terminationReasonsPage: TerminationReasonsPage;
  pimReportsPage: PimReportsPage;
  vacanciesPage: VacanciesPage;
  candidatesPage: CandidatesPage;
  adminUsersPage: AdminUsersPage;
  adminJobTitlesPage: AdminJobTitlesPage;
  adminWorkShiftsPage: AdminWorkShiftsPage;
  adminPayGradesPage: AdminSimpleListPage;
  adminEmploymentStatusPage: AdminSimpleListPage;
  adminJobCategoriesPage: AdminSimpleListPage;
  adminCorporateBrandingPage: AdminCorporateBrandingPage;
  adminSkillsPage: AdminSimpleListPage;
  adminEducationPage: AdminSimpleListPage;
  adminLicensesPage: AdminSimpleListPage;
  adminLanguagesPage: AdminSimpleListPage;
  adminMembershipsListPage: AdminSimpleListPage;
  adminNationalitiesPage: AdminSimpleListPage;
  adminGeneralInformationPage: AdminGeneralInformationPage;
  adminLocationsPage: AdminLocationsPage;
  adminStructurePage: AdminStructurePage;
  adminEmailConfigurationPage: AdminEmailConfigurationPage;
  adminEmailSubscriptionsPage: AdminEmailSubscriptionsPage;
  adminLocalizationPage: AdminLocalizationPage;
  adminLanguagePackagesPage: AdminLanguagePackagesPage;
}

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  pimPage: async ({ page }, use) => {
    await use(new PimPage(page));
  },
  leavePage: async ({ page }, use) => {
    await use(new LeavePage(page));
  },
  employeeListPage: async ({ page }, use) => {
    await use(new EmployeeListPage(page));
  },
  addEmployeePage: async ({ page }, use) => {
    await use(new AddEmployeePage(page));
  },
  personalDetailsPage: async ({ page }, use) => {
    await use(new PersonalDetailsPage(page));
  },
  contactDetailsPage: async ({ page }, use) => {
    await use(new ContactDetailsPage(page));
  },
  jobPage: async ({ page }, use) => {
    await use(new JobPage(page));
  },
  emergencyContactsPage: async ({ page }, use) => {
    await use(new EmergencyContactsPage(page));
  },
  dependentsPage: async ({ page }, use) => {
    await use(new DependentsPage(page));
  },
  immigrationPage: async ({ page }, use) => {
    await use(new ImmigrationPage(page));
  },
  salaryPage: async ({ page }, use) => {
    await use(new SalaryPage(page));
  },
  reportToPage: async ({ page }, use) => {
    await use(new ReportToPage(page));
  },
  qualificationsPage: async ({ page }, use) => {
    await use(new QualificationsPage(page));
  },
  membershipsPage: async ({ page }, use) => {
    await use(new MembershipsPage(page));
  },
  optionalFieldsPage: async ({ page }, use) => {
    await use(new OptionalFieldsPage(page));
  },
  customFieldsPage: async ({ page }, use) => {
    await use(new CustomFieldsPage(page));
  },
  dataImportPage: async ({ page }, use) => {
    await use(new DataImportPage(page));
  },
  reportingMethodsPage: async ({ page }, use) => {
    await use(new ReportingMethodsPage(page));
  },
  terminationReasonsPage: async ({ page }, use) => {
    await use(new TerminationReasonsPage(page));
  },
  pimReportsPage: async ({ page }, use) => {
    await use(new PimReportsPage(page));
  },
  vacanciesPage: async ({ page }, use) => {
    await use(new VacanciesPage(page));
  },
  candidatesPage: async ({ page }, use) => {
    await use(new CandidatesPage(page));
  },
  adminUsersPage: async ({ page }, use) => {
    await use(new AdminUsersPage(page));
  },
  adminJobTitlesPage: async ({ page }, use) => {
    await use(new AdminJobTitlesPage(page));
  },
  adminWorkShiftsPage: async ({ page }, use) => {
    await use(new AdminWorkShiftsPage(page));
  },
  adminPayGradesPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/viewPayGrades'));
  },
  adminEmploymentStatusPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/employmentStatus'));
  },
  adminJobCategoriesPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/jobCategory'));
  },
  adminCorporateBrandingPage: async ({ page }, use) => {
    await use(new AdminCorporateBrandingPage(page));
  },
  adminSkillsPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/viewSkills'));
  },
  adminEducationPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/viewEducation', 'Level'));
  },
  adminLicensesPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/viewLicenses'));
  },
  adminLanguagesPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/viewLanguages'));
  },
  adminMembershipsListPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/membership'));
  },
  adminNationalitiesPage: async ({ page }, use) => {
    await use(new AdminSimpleListPage(page, '/web/index.php/admin/nationality'));
  },
  adminGeneralInformationPage: async ({ page }, use) => {
    await use(new AdminGeneralInformationPage(page));
  },
  adminLocationsPage: async ({ page }, use) => {
    await use(new AdminLocationsPage(page));
  },
  adminStructurePage: async ({ page }, use) => {
    await use(new AdminStructurePage(page));
  },
  adminEmailConfigurationPage: async ({ page }, use) => {
    await use(new AdminEmailConfigurationPage(page));
  },
  adminEmailSubscriptionsPage: async ({ page }, use) => {
    await use(new AdminEmailSubscriptionsPage(page));
  },
  adminLocalizationPage: async ({ page }, use) => {
    await use(new AdminLocalizationPage(page));
  },
  adminLanguagePackagesPage: async ({ page }, use) => {
    await use(new AdminLanguagePackagesPage(page));
  },
});

export const authenticatedTest = test.extend<Pages>({
  page: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(env.username, env.password);
    await page.waitForURL('**/dashboard/index');
    await use(page);
  },
});

export { expect } from '@playwright/test';
