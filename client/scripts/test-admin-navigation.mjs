import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { outputFiles } = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
    contents: String.raw`
      import assert from 'node:assert/strict';
      import { createElement as h } from 'react';
      import { renderToStaticMarkup as render } from 'react-dom/server';
      import { createMemoryRouter, RouterProvider } from 'react-router-dom';
      import { resolveAdminLocation } from './src/components/AdminNavigation/adminNavigationConfig';
      import Navigation from './src/components/AdminNavigation/AdminNavigation';
      import Dashboard from './src/pages/AdminDashboard/AdminDashboard';
      import Daycare from './src/pages/Admin/DaycareAdmin/DaycareAdmin';

      export async function run() {
      function Page() {
        return h('div', null, h(Navigation),
          locationRouter.state.location.pathname === '/admin/daycare' ? h(Daycare) :
          locationRouter.state.location.pathname === '/admin/dashboard' ? h(Dashboard) : null);
      }
      let locationRouter;
      const cases = [
        ['/admin/dashboard', 'ניהול בית חב״ד', 'פרויקטים', 'AdminProjectsTab'],
        ['/admin/dashboard?tab=payments', 'ניהול בית חב״ד', 'כספי בית חב״ד', 'AdminPaymentsTab'],
        ['/admin/dashboard?tab=rebbeLetters', 'פעילות באתר', 'מכתבים לרבי', 'AdminRebbeLettersTab'],
        ['/admin/maftir-yona', 'פעילות באתר', 'מפטיר יונה'],
        ['/admin/arbaat-haminim', 'פעילות באתר', 'ארבעת המינים'],
        ['/admin/daycare', 'המעון', null, 'DaycareRegistrations'],
        ['/admin/daycare?tab=tasks', 'המעון', null, 'DaycareTasks'],
        ['/admin/daycare?tab=donations', 'המעון', 'תרומות למעון', 'DaycareDonationsAdmin'],
        ['/admin/daycare?tab=finance', 'המעון', 'כספי המעון', 'DaycareFinance'],
        ['/admin/daycare?tab=documents&section=welcome', 'המעון', null, 'DaycareParentDocuments'],
        ['/admin/daycare?tab=agreements', 'המעון', null, 'DaycareAgreements'],
        ['/admin/daycare-onboarding/123', 'המעון'],
        ['/admin/dashboard?tab=daycareRegistrations', 'המעון', null, 'AdminDaycareRegistrationsTab'],
        ['/admin/dashboard?tab=families', 'ניהול בית חב״ד', null, 'AdminFamiliesTab'],
        ['/admin/dashboard?tab=unknown', 'ניהול בית חב״ד', 'פרויקטים', 'AdminProjectsTab'],
      ];
      function check([url, group, screen, component]) {
        const html = render(h(RouterProvider, { router: locationRouter }));
        assert.equal(resolveAdminLocation(locationRouter.state.location.pathname, locationRouter.state.location.search).groupId, group === 'המעון' ? 'daycare' : group === 'פעילות באתר' ? 'website' : 'internal');
        if (screen) assert.equal(html.match(/<a aria-current="page"[^>]*>(.*?)<\/a>/s)?.[1].replace(/<[^>]*>/g, ''), screen);
        if (component) assert.match(html, new RegExp('data-test="' + component + '"'));
        assert.doesNotMatch(html, /href="[^"]*tab=(families|daycareRegistrations)"/);


        if (url.includes('section=welcome')) assert.match(html, /aria-pressed="true"[^>]*>ברוכים הבאים/);
        if (url.includes('tab=agreements')) assert.match(html, /aria-pressed="true"[^>]*>הסכם התקשרות/);
      }
      const routes = [{ path: '*', element: h(Page) }];
      locationRouter = createMemoryRouter(routes, { initialEntries: [cases[0][0]] });
      check(cases[0]);
      for (const item of cases.slice(1)) { await locationRouter.navigate(item[0]); check(item); }
      for (const item of cases.slice(0, -1).reverse()) { await locationRouter.navigate(-1); check(item); }
      for (const item of cases.slice(1)) { await locationRouter.navigate(1); check(item); }
      locationRouter.dispose();
      for (const item of cases) {
        locationRouter = createMemoryRouter(routes, { initialEntries: [item[0]] });
        check(item);
        locationRouter.dispose();
      }
      console.log('Admin navigation passed: URL loading, Back, Forward, refresh reconstruction, legacy destinations, tasks and document sections.');
      }
    `,
  },
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'isolate-screen-content', setup(builder) {
    builder.onLoad({ filter: /\.scss$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
    // Render the real navigation and screen containers; isolate data-loading screen bodies.
    builder.onLoad({ filter: /\/(Admin\w+Tab|DaycareDashboard|DaycareExpansion|DaycareFinance|DaycareRegistrations|DaycareTasks|DaycareAgreements|DaycareParentDocuments|DaycareAnnualPlan|DaycareDonationsAdmin)\.tsx$/ }, args => {
      const name = args.path.split('/').at(-1).replace('.tsx', '');
      return { contents: `import React from 'react'; export default function Screen() { return React.createElement('div', { 'data-test': '${name}' }); }`, loader: 'js' };
    });
  } }],
});
const testModule = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), testModule, testModule.exports);
await testModule.exports.run();
