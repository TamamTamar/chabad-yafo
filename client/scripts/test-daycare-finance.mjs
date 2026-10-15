import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadTs(path, dependencies = {}) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    new Function('exports', 'require', js)(exports, name => {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
    });
    return exports;
}
const utils = loadTs('../src/pages/Admin/DaycareAdmin/components/daycareFinanceUtils.ts');

// Run the actual hook's load/edit/save handlers. All I/O is an in-memory service.
async function financeHarness(normalize = value => value) {
    let cursor = 0;
    const slots = [], effects = [], saved = [];
    const react = {
        useState(initial) {
            const i = cursor++;
            if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
            return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
        },
        useMemo(callback) { return callback(); },
        useEffect(callback) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(callback); } },
    };
    const base = { currentChildren: 10, pricePerChild: 1000, targetChildren: 20 };
    base.monthlyCashflows = utils.getCurrentYearMonths().map(month => utils.getDefaultMonthlyCashflow(base, month));
    const service = {
        async getDaycareFinance() { return structuredClone(base); },
        async updateDaycareFinance(value) { saved.push(structuredClone(value)); return normalize(structuredClone(value)); },
    };
    const { useDaycareFinance } = loadTs('../src/pages/Admin/DaycareAdmin/components/useDaycareFinance.ts', {
        react, '../daycareAdminService': service, './daycareFinanceUtils': utils,
    });
    const render = () => { cursor = 0; return useDaycareFinance({ onChanged() {} }); };
    render(); effects.forEach(effect => effect());
    await new Promise(resolve => setImmediate(resolve));
    const month = utils.getCurrentMonthValue();
    return { render, saved, month, edit(key, value) { render().updateMonthlyCashflow(month, key, value); },
        displayed() { return render().getMonthlyInputValue(month, 'income'); },
        async save() { await render().handleSave(); },
        lastSavedIncome() { return saved.at(-1).monthlyCashflows.find(row => row.month === month).income; } };
}

test('manual 9,000 then 11 children displays and saves 11,000; later manual edits still work', async () => {
    const model = await financeHarness();
    model.edit('income', '9,000');
    assert.equal(model.displayed(), '9,000');
    model.edit('children', '11');
    assert.equal(Number(model.displayed()), 11000);
    await model.save();
    assert.equal(model.lastSavedIncome(), 11000);
    assert.equal(Number(model.displayed()), model.lastSavedIncome());
    model.edit('income', '9,000');
    await model.save();
    assert.equal(model.lastSavedIncome(), 9000);
    assert.equal(Number(model.displayed()), 9000);
});

test('price changes and month switching keep each displayed income equal to the saved value', async () => {
    const model = await financeHarness();
    model.edit('income', '9000');
    model.edit('pricePerChild', '1200');
    assert.equal(Number(model.displayed()), 12000);
    model.render().setSelectedMonth(`${model.month.slice(0, 4)}-01`);
    model.render().setSelectedMonth(model.month);
    await model.save();
    assert.equal(model.lastSavedIncome(), Number(model.displayed()));
});

test('invalid amounts block saving instead of silently submitting an earlier value', async () => {
    const model = await financeHarness();
    model.edit('income', '9000');
    model.edit('income', '9oops');
    await model.save();
    assert.equal(model.saved.length, 0);
    assert.match(model.render().saveError, /סכום לא תקין/);
    model.edit('income', '');
    await model.save();
    assert.equal(model.lastSavedIncome(), 0);
});

test('a successful save displays the canonical server response instead of an obsolete draft', async () => {
    const model = await financeHarness(value => ({ ...value, monthlyCashflows: value.monthlyCashflows.map(row => ({ ...row, income: Math.round(row.income) })) }));
    model.edit('income', '9000.4');
    await model.save();
    assert.equal(model.lastSavedIncome(), 9000.4);
    assert.equal(Number(model.displayed()), 9000);
});

test('pending or failed finance save never reports success and preserves edits for explicit retry', async t => {
    t.mock.method(console, 'error', () => {});
    let rejectSave;
    let offline = true;
    const model = await financeHarness(value => offline
        ? new Promise((_resolve, reject) => { rejectSave = reject; }) : value);
    model.edit('income', '9,000');
    const pending = model.save();
    assert.equal(model.render().saving, true);
    assert.equal(model.render().saveMessage, '');
    // A second click while the request is pending must not submit another save.
    await model.save();
    assert.equal(model.saved.length, 1);
    rejectSave(new Error('synthetic network outage'));
    await pending;
    assert.equal(model.render().saving, false);
    assert.equal(model.render().financeDirty, true);
    assert.equal(model.render().saveMessage, '');
    assert.match(model.render().saveError, /נכשלה/);
    assert.equal(model.displayed(), '9,000');
    offline = false;
    await model.save();
    assert.equal(model.lastSavedIncome(), 9000);
    assert.equal(model.render().financeDirty, false);
    assert.match(model.render().saveMessage, /בהצלחה/);
});
