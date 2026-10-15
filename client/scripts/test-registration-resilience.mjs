import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute real component handlers with deterministic hook state and no network.
// This tests save sequencing, not browser layout or react-hook-form validation.
function harness(path, services, extraSource = '') {
    let cursor = 0;
    const slots = [];
    const react = {
        useState(initial) {
            const i = cursor++;
            if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
            return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
        },
        useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
        useEffect() {},
    };
    const jsx = (type, props) => ({ type, props });
    const dependencies = {
        react,
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        'react-hook-form': {
            useForm: () => ({ register: () => ({}), control: {}, formState: { errors: {}, isSubmitting: false }, handleSubmit: fn => () => {
                pending = fn({ motherName: 'בדיקה', filledBy: 'mother' }); return pending;
            } }),
            useWatch: () => 'mother',
        },
    };
    let pending;
    const source = readFileSync(new URL(path, import.meta.url), 'utf8') + extraSource;
    const js = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const exports = {};
    new Function('exports', 'require', js)(exports, name => {
        if (name in dependencies) return dependencies[name];
        if (name.endsWith('/shifraPuaService')) return services;
        if (name.endsWith('/types/shifraPua')) return { israelToday: () => '2026-10-15', validPhone: () => true,
            shifraStatuses: { new: 'חדשה', coordinated: 'תואמה', delivered: 'נמסרה' }, formatDate: value => value };
        if (name.endsWith('.scss')) return {};
        if (name.endsWith('/Container') || name.endsWith('/AdminPageHeader')) return () => null;
        throw new Error(`Unexpected dependency: ${name}`);
    });
    return { render(props) { cursor = 0; return (exports.RegistrationCard ?? exports.default)(props); }, pending: () => pending };
}
function nodes(tree, match) {
    if (Array.isArray(tree)) return tree.flatMap(node => nodes(node, match));
    if (!tree || typeof tree !== 'object') return [];
    return [...(match(tree) ? [tree] : []), ...nodes(tree.props?.children, match)];
}
const form = tree => nodes(tree, node => node.type === 'form')[0];
const alerts = tree => nodes(tree, node => node.props?.role === 'alert');

test('registration stays pending, rejects duplicate clicks, shows errors, and succeeds only on acknowledgement', async () => {
    let resolve, reject, calls = 0;
    const model = harness('../src/pages/ShifraPua/ShifraPua.tsx', {
        registerShifraPua: () => { calls++; return new Promise((yes, no) => { resolve = yes; reject = no; }); },
        shifraError: () => 'synthetic failure',
    });
    form(model.render()).props.onSubmit({});
    form(model.render()).props.onSubmit({});
    assert.equal(calls, 1);
    assert.equal(nodes(model.render(), node => node.props?.role === 'status').length, 0);
    reject(new Error('lost connection or response'));
    await model.pending();
    assert.equal(alerts(model.render()).length, 1);
    assert.ok(form(model.render()));
    form(model.render()).props.onSubmit({});
    assert.equal(calls, 2);
    resolve();
    await model.pending();
    assert.equal(nodes(model.render(), node => node.props?.role === 'status').length, 1);
    assert.equal(form(model.render()), undefined);
});

test('admin save retains draft on failure and calls onSaved only after confirmed success', async () => {
    let reject, resolve, saved = 0, submitted;
    const model = harness('../src/pages/Admin/ShifraPuaAdmin/ShifraPuaAdmin.tsx', {
        updateShifraPua: value => { submitted = value; return new Promise((yes, no) => { resolve = yes; reject = no; }); },
        shifraError: () => 'synthetic failure',
    }, '\nexport { RegistrationCard };');
    const props = { item: { _id: 'qa', motherName: 'בדיקה', status: 'new', revision: 0, previousMeals: 0, mealHistory: [], filledBy: 'mother' }, onSaved() { saved++; } };
    const render = () => model.render(props);
    nodes(render(), node => node.type === 'button' && node.props['aria-expanded'] === false)[0].props.onClick();
    const select = nodes(render(), node => node.type === 'select')[0];
    select.props.onChange({ target: { value: 'coordinated' } });
    form(render()).props.onSubmit({ preventDefault() {} });
    assert.equal(saved, 0);
    assert.equal(render().props['aria-busy'], true);
    reject(new Error('network outage'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(saved, 0);
    assert.equal(alerts(render()).length, 1);
    assert.equal(nodes(render(), node => node.type === 'select')[0].props.value, 'coordinated');
    form(render()).props.onSubmit({ preventDefault() {} });
    assert.equal(submitted.status, 'coordinated');
    resolve();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(saved, 1);
    assert.equal(alerts(render()).length, 0);
});
