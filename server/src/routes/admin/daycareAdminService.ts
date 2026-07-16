import { DaycareDocument } from "../../models/DaycareDocument";
import { DaycareFinanceSettings } from "../../models/DaycareFinanceSettings";
import { DaycareTask } from "../../models/DaycareTask";
import type { IDaycareFinanceSettings, IDaycareTask } from "../../types/daycareAdmin";
import {
    defaultDaycareDocuments,
    defaultDaycareTasks,
    defaultFinanceSettings,
    obsoleteDefaultTaskTitles,
    openingTargetChildren,
} from "./daycareDefaults";
import { openingEquipmentSubtasks } from "./daycareTaskPresets";
import { createFallbackSubtasks, getTaskStatusFromSubtasks } from "./daycareTaskStatus";

const getTaskDefaultUpdatePayload = (task: IDaycareTask) => {
    const payload: Partial<IDaycareTask> = {};

    if (task.resourceLabel) {
        payload.resourceLabel = task.resourceLabel;
    }

    if (task.resourceUrl) {
        payload.resourceUrl = task.resourceUrl;
    }

    if (task.notes) {
        payload.notes = task.notes;
    }

    if (task.stage) {
        payload.stage = task.stage;
    }

    return payload;
};

export const ensureDefaultTasks = async () => {
    await DaycareTask.deleteMany({
        title: { $in: obsoleteDefaultTaskTitles },
        status: { $ne: "הושלם" },
    });

    const equipmentTaskExists = await DaycareTask.exists({
        title: "רשימת ציוד לקנייה לפתיחת המעון",
    });

    if (!equipmentTaskExists) {
        await DaycareTask.updateOne(
            {
                title: "הכנת רשימת ציוד מינימלית לפתיחה",
                status: { $ne: "הושלם" },
            },
            {
                $set: {
                    title: "רשימת ציוד לקנייה לפתיחת המעון",
                    category: "ציוד",
                    priority: "דחופה",
                    stage: "לפני פתיחה",
                    notes: "סמני כל פריט שנקנה. כשהכל מסומן המשימה תושלם.",
                    subtasks: openingEquipmentSubtasks,
                },
            }
        );
    }

    const existingTasks = await DaycareTask.find().select("title");
    const existingTitles = new Set(existingTasks.map((task) => task.title));
    const missingTasks = defaultDaycareTasks.filter(
        (task) => !existingTitles.has(task.title)
    );

    if (missingTasks.length > 0) {
        await DaycareTask.insertMany(missingTasks);
    }

    await Promise.all(
        defaultDaycareTasks
            .filter((task) => task.resourceUrl || task.notes)
            .map((task) => {
                const updateConditions: Record<string, unknown>[] = [
                    { resourceUrl: { $exists: false } },
                    { resourceUrl: "" },
                    { notes: { $exists: false } },
                    { notes: "" },
                    { stage: { $exists: false } },
                ];

                if (task.subtasks) {
                    updateConditions.push(
                        { subtasks: { $exists: false } },
                        { subtasks: { $size: 0 } }
                    );
                }

                return DaycareTask.updateOne(
                    {
                        title: task.title,
                        $or: updateConditions,
                    },
                    {
                        $set: getTaskDefaultUpdatePayload(task),
                    }
                );
            })
    );

    await Promise.all(
        defaultDaycareTasks
            .filter((task) => task.subtasks && task.subtasks.length > 0)
            .map(async (defaultTask) => {
                const existingTask = await DaycareTask.findOne({
                    title: defaultTask.title,
                });

                if (!existingTask || !defaultTask.subtasks) {
                    return;
                }

                const existingSubtasks = existingTask.subtasks || [];
                const existingTitles = new Set(
                    existingSubtasks.map((subtask) => subtask.title)
                );
                const missingSubtasks = defaultTask.subtasks.filter(
                    (subtask) => !existingTitles.has(subtask.title)
                );

                if (missingSubtasks.length === 0) {
                    return;
                }

                await DaycareTask.updateOne(
                    { _id: existingTask._id },
                    {
                        $set: {
                            subtasks: [...existingSubtasks, ...missingSubtasks],
                        },
                    }
                );
            })
    );

    const tasksWithoutSubtasks = await DaycareTask.find({
        $or: [
            { subtasks: { $exists: false } },
            { subtasks: { $size: 0 } },
        ],
    });

    await Promise.all(
        tasksWithoutSubtasks.map(async (task) => {
            task.subtasks = createFallbackSubtasks(task.status);
            task.status = getTaskStatusFromSubtasks(task.subtasks, task.status);
            task.markModified("subtasks");
            await task.save();
        })
    );

    const tasksWithSubtasks = await DaycareTask.find({
        "subtasks.0": { $exists: true },
    });

    await Promise.all(
        tasksWithSubtasks.map(async (task) => {
            const nextStatus = getTaskStatusFromSubtasks(
                task.subtasks,
                task.status
            );

            if (task.status === nextStatus) {
                return;
            }

            task.status = nextStatus;
            await task.save();
        })
    );
};

export const ensureDefaultDocuments = async () => {
    const existingDocuments = await DaycareDocument.find().select("name");
    const existingNames = new Set(
        existingDocuments.map((document) => document.name)
    );
    const missingDocuments = defaultDaycareDocuments.filter(
        (document) => !existingNames.has(document.name)
    );

    if (missingDocuments.length > 0) {
        await DaycareDocument.insertMany(missingDocuments);
    }

    await Promise.all(
        defaultDaycareDocuments
            .filter((document) => document.fileUrl)
            .map((document) =>
                DaycareDocument.updateOne(
                    {
                        name: document.name,
                        $or: [
                            { fileUrl: { $exists: false } },
                            { fileUrl: "" },
                        ],
                    },
                    {
                        $set: {
                            fileUrl: document.fileUrl,
                        },
                    }
                )
            )
    );
};

export const getFinanceSettings = async () => {
    const existingSettings = await DaycareFinanceSettings.findOne();

    if (existingSettings) {
        return existingSettings;
    }

    return DaycareFinanceSettings.create(defaultFinanceSettings);
};

export const getUpcomingSeptemberLabel = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const september = new Date(currentYear, 8, 1);
    const openingYear = now <= september ? currentYear : currentYear + 1;

    return `ספטמבר ${openingYear}`;
};

export const getGeneralStatus = (
    actualRegistrations: number,
    openTasks: number,
    urgentOpenTasks: number
) => {
    if (actualRegistrations >= openingTargetChildren && openTasks === 0) {
        return "מוכן לפתיחה";
    }

    if (urgentOpenTasks > 0 || actualRegistrations < openingTargetChildren) {
        return "דורש טיפול";
    }

    return "בהכנה";
};

export const getDocumentReady = (
    documents: Array<{ name: string; status: string }>,
    patterns: string[]
) => {
    return documents.some((document) => {
        const matchesName = patterns.some((pattern) =>
            document.name.includes(pattern)
        );

        return matchesName && document.status === "קיים";
    });
};

export const getTaskReady = (
    tasks: Array<{ title: string; category: string; status: string }>,
    patterns: string[],
    categories: string[] = []
) => {
    return tasks.some((task) => {
        const matchesTitle = patterns.some((pattern) =>
            task.title.includes(pattern)
        );
        const matchesCategory =
            categories.length === 0 || categories.includes(task.category);

        return matchesCategory && matchesTitle && task.status === "הושלם";
    });
};

const getMonthlyCashflowPayload = (
    cashflows: IDaycareFinanceSettings["monthlyCashflows"] = []
) =>
    cashflows.map((cashflow) => ({
        month: cashflow.month,
        children: Number(cashflow.children) || 0,
        pricePerChild: Number(cashflow.pricePerChild) || 0,
        income: Number(cashflow.income) || 0,
        extraIncome: Number(cashflow.extraIncome) || 0,
        rent: Number(cashflow.rent) || 0,
        directorSalary: Number(cashflow.directorSalary) || 0,
        staffSalaries: Number(cashflow.staffSalaries) || 0,
        food: Number(cashflow.food) || 0,
        supplies: Number(cashflow.supplies) || 0,
        insuranceAndPermits: Number(cashflow.insuranceAndPermits) || 0,
        extraExpenses: Number(cashflow.extraExpenses) || 0,
        renovationKitchen: Number(cashflow.renovationKitchen) || 0,
        renovationYard: Number(cashflow.renovationYard) || 0,
        renovationConstruction: Number(cashflow.renovationConstruction) || 0,
        renovationSafety: Number(cashflow.renovationSafety) || 0,
        renovationEquipment: Number(cashflow.renovationEquipment) || 0,
        renovationLabor: Number(cashflow.renovationLabor) || 0,
        renovationOther: Number(cashflow.renovationOther) || 0,
        renovationRepayment: Number(cashflow.renovationRepayment) || 0,
    }));

export const getFinanceUpdatePayload = (body: Partial<IDaycareFinanceSettings>) => ({
    pricePerChild: body.pricePerChild ?? 0,
    currentChildren: body.currentChildren ?? 0,
    targetChildren: body.targetChildren ?? 0,
    rent: body.rent ?? 0,
    directorSalary: body.directorSalary ?? 0,
    staffSalaries: body.staffSalaries ?? 0,
    food: body.food ?? 0,
    supplies: body.supplies ?? 0,
    insuranceAndPermits: body.insuranceAndPermits ?? 0,
    extraExpenses: body.extraExpenses ?? 0,
    renovationKitchen: body.renovationKitchen ?? 0,
    renovationYard: body.renovationYard ?? 0,
    renovationConstruction: body.renovationConstruction ?? 0,
    renovationSafety: body.renovationSafety ?? 0,
    renovationEquipment: body.renovationEquipment ?? 0,
    renovationLabor: body.renovationLabor ?? 0,
    renovationOther: body.renovationOther ?? 0,
    monthlyCashflows: getMonthlyCashflowPayload(body.monthlyCashflows),
});

export const getDaycareTaskActualCosts = async () => {
    const tasks = await DaycareTask.find().select("subtasks");

    return tasks.reduce((taskTotal, task) => {
        const subtaskTotal = (task.subtasks || []).reduce(
            (total, subtask) => total + (Number(subtask.actualCost) || 0),
            0
        );

        return taskTotal + subtaskTotal;
    }, 0);
};
