import { DaycareDocument } from "../../models/DaycareDocument";
import { DaycareFinanceSettings } from "../../models/DaycareFinanceSettings";
import { DaycareTask } from "../../models/DaycareTask";
import type { IDaycareFinanceSettings, IDaycareTask } from "../../types/daycareAdmin";
import {
    defaultDaycareDocuments,
    defaultDaycareTasks,
    defaultFinanceSettings,
    openingTargetChildren,
} from "./daycareDefaults";

export const ensureDefaultTasks = async () => {
    const financeSettings = await getFinanceSettings();

    if (financeSettings.taskDefaultsInitialized) {
        return;
    }

    const existingTask = await DaycareTask.exists({});

    if (!existingTask) {
        await DaycareTask.insertMany(defaultDaycareTasks);
    }

    financeSettings.taskDefaultsInitialized = true;
    await financeSettings.save();
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
