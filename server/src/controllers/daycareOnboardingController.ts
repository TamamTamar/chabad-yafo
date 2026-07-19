import type { Request, Response } from "express";
import {
    parseAdminAccessPatch,
    parseAdminOverallStatusPatch,
    parseAdminStepPatch,
    parseCreateOnboardingFromInquiry,
    parseDeleteOnboarding,
    parseLegacyOnboardingImport,
    parsePublicDaycareProfile,
} from "../schemas/daycareOnboardingValidation";
import { DaycareRegistration } from "../models/DaycareRegistration";
import { Types } from "mongoose";
import { createDaycareOnboardingFromInquiry } from "../services/daycareOnboardingCreationService";
import {
    buildParentAccessUrl,
    deleteDaycareOnboarding,
    DaycareOnboardingServiceError,
    getAdminOnboarding,
    getPublicOnboardingByToken,
    listAdminDaycareFamilies,
    listAdminOnboardings,
    listOnboardingAudit,
    regenerateOnboardingParentAccess,
    revokeParentAccess,
    submitPublicDaycareProfile,
    submitPublicParentBundle,
    updateAdminOnboardingStep,
    updateAdminOverallStatus,
} from "../services/daycareOnboardingService";
import { importLegacyDaycareEnrollment } from "../services/legacyDaycareEnrollmentImportService";
import { logger } from "../utils/logger";

const sendControllerError = (
    res: Response,
    error: unknown,
    fallbackMessage: string
) => {
    if (error instanceof DaycareOnboardingServiceError) {
        return res.status(error.statusCode).json({
            success: false,
            code: error.code,
            message: error.message,
        });
    }

    logger.error(fallbackMessage, error);
    return res.status(500).json({
        success: false,
        message: fallbackMessage,
    });
};

export const listAdminDaycareOnboardings = async (
    _req: Request,
    res: Response
) => {
    try {
        const data = await listAdminOnboardings();
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to get daycare onboarding records"
        );
    }
};

export const getAdminDaycareOnboarding = async (
    req: Request,
    res: Response
) => {
    try {
        const data = await getAdminOnboarding(req.params.id);
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to get daycare onboarding"
        );
    }
};

export const listAdminDaycareOnboardingFamilies = async (
    _req: Request,
    res: Response
) => {
    try {
        const data = await listAdminDaycareFamilies();
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to get daycare families"
        );
    }
};

export const createLegacyDaycareOnboarding = async (
    req: Request,
    res: Response
) => {
    const parsed = parseLegacyOnboardingImport(req.body as unknown);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.message,
        });
    }

    try {
        const result = await importLegacyDaycareEnrollment({
            enrollmentId: req.params.enrollmentId,
            schoolYear: parsed.data.schoolYear,
            existingFamilyId: parsed.data.existingFamilyId,
        });

        res.setHeader("Cache-Control", "no-store");
        return res.status(result.created ? 201 : 200).json({
            success: true,
            created: result.created,
            data: result.data,
            ...(result.created
                ? {
                      parentAccessUrl: buildParentAccessUrl(
                          result.rawToken,
                          req.get("origin")
                      ),
                  }
                : {}),
        });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to create daycare onboarding"
        );
    }
};

const sendCreatedOnboarding = (
    res: Response,
    result: Awaited<ReturnType<typeof createDaycareOnboardingFromInquiry>>,
    requestOrigin?: string
) => {
    res.setHeader("Cache-Control", "no-store");
    return res.status(result.created ? 201 : 200).json({
        success: true,
        created: result.created,
        data: result.data,
        ...(result.created
            ? {
                  parentAccessUrl: buildParentAccessUrl(
                      result.rawToken,
                      requestOrigin
                  ),
              }
            : {}),
    });
};

const parseCreationOrRespond = (req: Request, res: Response) => {
    const parsed = parseCreateOnboardingFromInquiry(req.body as unknown);

    if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.message });
        return null;
    }

    return parsed.data;
};

const isOnboardingEligibleStatus = (status: string | undefined) =>
    status === "רוצה להירשם";

export const createDaycareOnboardingFromRegistration = async (
    req: Request,
    res: Response
) => {
    const creation = parseCreationOrRespond(req, res);

    if (!creation) {
        return;
    }

    if (!Types.ObjectId.isValid(req.params.registrationId)) {
        return res.status(404).json({
            success: false,
            message: "Registration not found",
        });
    }

    try {
        const registration = await DaycareRegistration.findById(
            req.params.registrationId
        ).exec();

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }

        if (!isOnboardingEligibleStatus(registration.status)) {
            return res.status(409).json({
                success: false,
                code: "REGISTRATION_NOT_READY_FOR_ONBOARDING",
                message: "Registration is not ready for onboarding",
            });
        }

        const result = await createDaycareOnboardingFromInquiry({
            ...creation,
            temporaryParentName: registration.parentName,
            temporaryParentPhone: registration.phone,
            temporaryChildAge: registration.childAge,
            origin: {
                type: "daycareRegistration",
                recordId: registration._id,
            },
            familyId:
                registration.daycareFamilyId ??
                (creation.existingFamilyId
                    ? new Types.ObjectId(creation.existingFamilyId)
                    : undefined),
            childId: registration.daycareChildId,
        });

        return sendCreatedOnboarding(res, result, req.get("origin"));
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to create onboarding from registration"
        );
    }
};

export const deleteAdminDaycareOnboarding = async (
    req: Request,
    res: Response
) => {
    const parsed = parseDeleteOnboarding(req.body as unknown);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.message,
        });
    }

    try {
        const data = await deleteDaycareOnboarding(req.params.id);
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to delete daycare onboarding"
        );
    }
};

export const patchAdminDaycareOnboarding = async (
    req: Request,
    res: Response
) => {
    const parsed = parseAdminOverallStatusPatch(req.body as unknown);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.message,
        });
    }

    try {
        const data = await updateAdminOverallStatus(
            req.params.id,
            parsed.data.overallStatusOverride
        );
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to update daycare onboarding"
        );
    }
};

export const patchAdminDaycareOnboardingStep = async (
    req: Request,
    res: Response
) => {
    const parsed = parseAdminStepPatch(req.body as unknown);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.message,
        });
    }

    try {
        const data = await updateAdminOnboardingStep(
            req.params.id,
            req.params.stepKey,
            parsed.data
        );
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to update daycare onboarding step"
        );
    }
};

export const patchAdminDaycareOnboardingAccess = async (
    req: Request,
    res: Response
) => {
    const parsed = parseAdminAccessPatch(req.body as unknown);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.message,
        });
    }

    try {
        const data = await revokeParentAccess(req.params.id);
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to update parent access"
        );
    }
};

export const regenerateAdminDaycareOnboardingLink = async (
    req: Request,
    res: Response
) => {
    try {
        const result = await regenerateOnboardingParentAccess(req.params.id);

        res.setHeader("Cache-Control", "no-store");
        return res.json({
            success: true,
            data: result.data,
            parentAccessUrl: buildParentAccessUrl(
                result.rawToken,
                req.get("origin")
            ),
        });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to regenerate parent access link"
        );
    }
};

export const getAdminDaycareOnboardingAudit = async (
    req: Request,
    res: Response
) => {
    try {
        const data = await listOnboardingAudit(req.params.id);
        return res.json({ success: true, data });
    } catch (error: unknown) {
        return sendControllerError(
            res,
            error,
            "Failed to get daycare onboarding audit"
        );
    }
};

export const getPublicDaycareOnboarding = async (
    req: Request,
    res: Response
) => {
    try {
        const data = await getPublicOnboardingByToken(req.params.token);
        return res.json({ success: true, data });
    } catch (error: unknown) {
        if (
            error instanceof DaycareOnboardingServiceError &&
            error.code === "PUBLIC_LINK_UNAVAILABLE"
        ) {
            return res.status(404).json({
                success: false,
                code: error.code,
                message: "הקישור אינו תקין או שאינו פעיל עוד.",
            });
        }

        return sendControllerError(
            res,
            error,
            "Failed to get daycare onboarding"
        );
    }
};

export const submitPublicDaycareOnboardingProfile = async (
    req: Request,
    res: Response
) => {
    const parsed = parsePublicDaycareProfile(req.body as unknown);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            code: "INVALID_PROFILE",
            message: "חלק מהפרטים חסרים או אינם תקינים. בדקו את הטופס ונסו שוב.",
        });
    }

    try {
        const data = await submitPublicDaycareProfile(
            req.params.token,
            parsed.data
        );
        return res.json({
            success: true,
            message: "הפרטים נשלחו לצוות המעון לבדיקה.",
            data,
        });
    } catch (error: unknown) {
        if (
            error instanceof DaycareOnboardingServiceError &&
            error.code === "PUBLIC_LINK_UNAVAILABLE"
        ) {
            return res.status(404).json({
                success: false,
                code: error.code,
                message: "הקישור אינו תקין או שאינו פעיל עוד.",
            });
        }

        return sendControllerError(
            res,
            error,
            "לא הצלחנו לשמור את הפרטים. נסו שוב או פנו לצוות המעון."
        );
    }
};

export const submitPublicDaycareOnboardingBundle = async (
    req: Request,
    res: Response
) => {
    try {
        const data = await submitPublicParentBundle(req.params.token);
        return res.json({
            success: true,
            message: "התיק נשלח לצוות המעון לבדיקה.",
            data,
        });
    } catch (error: unknown) {
        if (
            error instanceof DaycareOnboardingServiceError &&
            error.code === "PUBLIC_LINK_UNAVAILABLE"
        ) {
            return res.status(404).json({
                success: false,
                code: error.code,
                message: "הקישור אינו תקין או שאינו פעיל עוד.",
            });
        }
        return sendControllerError(
            res,
            error,
            "לא הצלחנו לשלוח את התיק לצוות המעון. נסו שוב."
        );
    }
};
