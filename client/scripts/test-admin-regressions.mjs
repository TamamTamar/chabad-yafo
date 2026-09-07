import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { outputFiles } = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
    contents: `
      import assert from 'node:assert/strict';
      import { createElement as h } from 'react';
      import { renderToStaticMarkup as render } from 'react-dom/server';
      import { useDaycareDonationsAdmin } from './src/pages/Admin/DaycareAdmin/components/useDaycareDonationsAdmin';
      import { getInactiveRecommendedItems } from './src/pages/Admin/DaycareAdmin/components/donationRecommendations';
      import Items from './src/pages/Admin/DaycareAdmin/components/DonationItemsAdminView';
      import Manual from './src/pages/Admin/DaycareAdmin/components/DonationManualAdminView';
      import Overview from './src/pages/Admin/DaycareOnboarding/components/OnboardingOverview';
      import Steps from './src/pages/Admin/DaycareOnboarding/components/OperationalStepsSection';

      const item = (id, extra = {}) => ({
        id, title: id, categoryId: 'equipment', goal: 1000, raised: 200,
        acceptingDonations: true, description: '', ...extra,
      });
      const items = [item('open'), item('done', { raised: 1000 }),
        item('closed', { acceptingDonations: false }), item('urgent', { openingPriority: 1 })];
      const campaign = { items, categories: [], recommendedChoiceIds: [] };
      let model;
      function CaptureModel() { model = useDaycareDonationsAdmin(); return null; }
      render(h(CaptureModel));

      const inactive = getInactiveRecommendedItems(items,
        ['general', 'open', 'done', 'closed', 'missing'], model.getInactiveRecommendationLabel);
      assert.deepEqual(inactive.map(item => item.id), ['done', 'closed']);
      assert.deepEqual(getInactiveRecommendedItems([], ['general'], model.getInactiveRecommendationLabel), []);
      assert.deepEqual(model.getAutomaticRecommendationIds(items), ['urgent', 'open', 'general']);
      assert.equal(model.getItemRemaining(items[0]), 800);
      assert.equal(model.getItemRemaining(item('over', { raised: 1500 })), 0);

      const itemsHtml = render(h(Items, { model: { ...model, campaign, activeView: 'items' } }));
      assert.match(itemsHtml, /name="choice1"/);
      const manualHtml = render(h(Manual, { model: { ...model, campaign, activeView: 'manual' } }));
      assert.match(manualHtml, /חסרים ₪800/);
      const warningHtml = render(h(Items, { model: { ...model,
        campaign: { ...campaign, recommendedChoiceIds: ['done', 'closed', 'general'] },
        activeView: 'items', inactiveRecommendedItems: inactive,
        effectiveRecommendationIds: ['urgent', 'open', 'general'],
      } }));
      assert.match(warningHtml, /done · closed/);

      const overviewProps = { onboarding: { child: {}, guardians: [], schoolYear: '2026-2027' },
        adminProgressPercentage: 100, adminCompletedSteps: 4, manageableStepCount: 4,
        notice: '', error: '', reviewChecklist: [], allDocumentsReady: true,
        allDocumentsSubmitted: true, scrollToCaseSection() {},
      };
      assert.match(render(h(Overview, { ...overviewProps, allDocumentsApproved: false })), /אישור כל הפרטים והמסמכים/);
      assert.doesNotMatch(render(h(Overview, { ...overviewProps, allDocumentsApproved: true })), /אישור כל הפרטים והמסמכים/);

      const step = { key: 'registrationFeeReceived', title: 'תשלום', order: 1,
        status: 'notStarted', responsibleParty: 'admin', source: 'admin', isVisibleToParent: true };
      const stepProps = { operationalSteps: [step], drafts: {}, dirtyStepKeys: new Set(),
        savingStepKey: null, isDirty: false, updateDraft() {}, async saveStep() {} };
      const blockedText = /זמין לאחר קבלת אישור הקמת הוראת הקבע מנדרים/;
      assert.match(render(h(Steps, { ...stepProps, standingOrderActive: false })), blockedText);
      assert.doesNotMatch(render(h(Steps, { ...stepProps, standingOrderActive: true })), blockedText);
      console.log('Admin regression checks passed: recommendations, item/manual views, document approval, standing-order gating.');
    `,
  },
  bundle: true, platform: 'node', format: 'cjs', write: false, jsx: 'automatic',
  define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'styles', setup(builder) {
    builder.onLoad({ filter: /\.scss$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
  } }],
});
new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), { exports: {} }, {});
