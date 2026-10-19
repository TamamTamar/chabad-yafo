import { DaycareDocument } from '../../models/DaycareDocument';
import { DaycareFinanceSettings } from '../../models/DaycareFinanceSettings';
import { DaycareTask } from '../../models/DaycareTask';
import { defaultDaycareDocuments, defaultDaycareTasks, defaultFinanceSettings } from './daycareDefaults';

// Mutation-only helper: finance PATCH still supports the first explicit save.
export const getOrCreateFinanceSettingsForMutation = async () =>
    (await DaycareFinanceSettings.findOne()) ?? DaycareFinanceSettings.create(structuredClone(defaultFinanceSettings));

// Explicit bootstrap only. Existing document fields are never repaired or replaced.
// Tasks retain the old rule: seed the full checklist only when the collection is empty
// and its initialization marker is not already set (so deletions are not undone).
const initialize = async () => {
    const settings = await getOrCreateFinanceSettingsForMutation();
    let tasksCreated = 0;
    if (!settings.taskDefaultsInitialized) {
        if (!(await DaycareTask.exists({}))) {
            tasksCreated = (await DaycareTask.insertMany(structuredClone(defaultDaycareTasks))).length;
        }
        settings.taskDefaultsInitialized = true;
        await settings.save();
    }
    const existing = await DaycareDocument.find().select('name');
    const names = new Set(existing.map(document => document.name));
    const missing = defaultDaycareDocuments.filter(document => !names.has(document.name));
    const documentsCreated = missing.length
        ? (await DaycareDocument.insertMany(structuredClone(missing))).length : 0;
    return { tasksCreated, documentsCreated };
};

// Coalesce concurrent requests within this process. Multi-instance bootstrap still
// needs an operational single-writer window; no new database/index is introduced.
let inFlight: ReturnType<typeof initialize> | undefined;
export const initializeDaycareDefaults = () => {
    if (!inFlight) inFlight = initialize().finally(() => { inFlight = undefined; });
    return inFlight;
};
