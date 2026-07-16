import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { DaycareDocument } from "../../models/DaycareDocument";
import { DaycareRegistration } from "../../models/DaycareRegistration";
import { DaycareTask } from "../../models/DaycareTask";
import { openingTargetChildren } from "./daycareDefaults";
import {
    ensureDefaultDocuments,
    ensureDefaultTasks,
    getDocumentReady,
    getFinanceSettings,
    getGeneralStatus,
    getTaskReady,
    getUpcomingSeptemberLabel,
} from "./daycareAdminService";

const router = Router();

router.get("/daycare/overview", requireAdmin, async (_req, res) => {
    try {
        await Promise.all([ensureDefaultTasks(), ensureDefaultDocuments()]);

        const [
            registeredCount,
            interestedCount,
            openTasks,
            completedTasks,
            urgentOpenTasks,
            tasks,
            documents,
            financeSettings,
        ] = await Promise.all([
            DaycareRegistration.countDocuments({ status: "נרשם" }),
            DaycareRegistration.countDocuments({
                $or: [{ status: { $ne: "נרשם" } }, { status: { $exists: false } }],
            }),
            DaycareTask.countDocuments({ status: { $ne: "הושלם" } }),
            DaycareTask.countDocuments({ status: "הושלם" }),
            DaycareTask.countDocuments({
                status: { $ne: "הושלם" },
                priority: "דחופה",
            }),
            DaycareTask.find().select("title category status"),
            DaycareDocument.find().select("name status"),
            getFinanceSettings(),
        ]);

        const actualRegistrations = registeredCount;
        const trackedChildren = Math.max(
            actualRegistrations,
            financeSettings.currentChildren
        );
        const expansionAlertActive = trackedChildren >= 7;
        const expansionItems = [
            {
                key: "licensing",
                label: "מוכנות לרישוי",
                ready:
                    getDocumentReady(documents, ["רישוי", "תיק התרחבות"]) ||
                    getTaskReady(tasks, ["רישוי", "מעל 6", "מעל 7"], ["אישורים"]),
            },
            {
                key: "staffing",
                label: "כוח אדם",
                ready: getTaskReady(tasks, ["גיוס", "תקן", "כוח אדם"], [
                    "כוח אדם",
                ]),
            },
            {
                key: "insurance",
                label: "ביטוחים",
                ready: getDocumentReady(documents, ["ביטוח"]),
            },
            {
                key: "documents",
                label: "מסמכים",
                ready:
                    getDocumentReady(documents, ["טופס הרשמה", "אישורי צוות"]) &&
                    getDocumentReady(documents, ["בטיחות", "כיבוי אש"]),
            },
            {
                key: "parentContracts",
                label: "חוזי הורים",
                ready: getDocumentReady(documents, ["חוזה הורים"]),
            },
            {
                key: "payments",
                label: "תשלומים",
                ready:
                    financeSettings.pricePerChild > 0 &&
                    getDocumentReady(documents, ["מעקב תשלומים"]),
            },
        ];
        const readyExpansionItems = expansionItems.filter((item) => item.ready)
            .length;

        return res.json({
            success: true,
            data: {
                openingTargetChildren,
                actualRegistrations,
                interestedCount,
                openTasks,
                completedTasks,
                generalStatus: getGeneralStatus(
                    actualRegistrations,
                    openTasks,
                    urgentOpenTasks
                ),
                targetOpeningDate: getUpcomingSeptemberLabel(),
                linkedPublicRegistrations:
                    registeredCount + interestedCount,
                expansion: {
                    thresholdChildren: 7,
                    trackedChildren,
                    alertActive: expansionAlertActive,
                    status:
                        readyExpansionItems === expansionItems.length
                            ? "מוכן להתרחבות"
                            : expansionAlertActive
                              ? "דורש טיפול לפני הרחבה"
                              : "במעקב",
                    readyItems: readyExpansionItems,
                    totalItems: expansionItems.length,
                    items: expansionItems,
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare overview",
        });
    }
});

export { router as daycareOverviewRoutes };
