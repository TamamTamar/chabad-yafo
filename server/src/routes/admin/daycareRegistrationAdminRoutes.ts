import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { DaycareRegistration } from "../../models/DaycareRegistration";
import { listAdminOnboardings } from "../../services/daycareOnboardingService";

const router = Router();

router.get("/daycare/registrations", requireAdmin, async (_req, res) => {
    try {
        const [registrations, onboardings] = await Promise.all([
            DaycareRegistration.find().sort({ createdAt: -1 }),
            listAdminOnboardings(),
        ]);
        const onboardingByOrigin = new Map<
            string,
            (typeof onboardings)[number]
        >();

        for (const onboarding of onboardings) {
            if (!onboarding.origin?.recordId) {
                continue;
            }

            const key = `${onboarding.origin.type}:${onboarding.origin.recordId}`;

            if (!onboardingByOrigin.has(key)) {
                onboardingByOrigin.set(key, onboarding);
            }
        }
        const withOnboardingSummary = <T extends { id: string; toObject(): object }>(
            record: T,
            sourceType: "daycareRegistration"
        ) => ({
            ...record.toObject(),
            onboardingSummary:
                onboardingByOrigin.get(`${sourceType}:${record.id}`) ?? null,
        });

        return res.json({
            success: true,
            data: {
                registrations: registrations.map((registration) =>
                    withOnboardingSummary(
                        registration,
                        "daycareRegistration"
                    )
                ),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare registrations",
        });
    }
});

router.patch("/daycare/public-registrations/:id", requireAdmin, async (req, res) => {
    try {
        const registration = await DaycareRegistration.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }

        return res.json({
            success: true,
            data: registration,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare registration",
        });
    }
});

export { router as daycareRegistrationAdminRoutes };
