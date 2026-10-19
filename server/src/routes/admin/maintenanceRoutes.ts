import {ShifraPuaRegistration} from '../../models/ShifraPuaRegistration';
import {ShifraPuaWeek} from '../../models/ShifraPuaWeek';
import {ShifraPuaRecipe,ShifraPuaSavedMenu} from '../../models/ShifraPuaRecipe';
import { Router } from 'express';
import { requireAdmin } from '../../middleware/adminAuth';
import { requireSecureAdminMutation } from '../../middleware/adminMutationSecurity';
import { withMaintenanceAuthorization } from '../../config/maintenanceAuthorization';
import { ensureDaycareOnboardingIndexes } from '../../services/daycareOnboardingIndexService';
import { ensureDaycareAgreementIndexes } from '../../services/daycareAgreementIndexService';
import { ensureDaycarePaymentStorage } from '../../services/daycarePaymentIndexService';
import { ensureDefaultAgreementDraft, reconcileAgreementOnboardingSteps } from '../../services/daycareAgreementService';
import { ensureDefaultParentDocumentYear, backfillParentDocumentSnapshots } from '../../services/daycareParentDocumentService';
import { ensureDefaultDaycareAnnualPlan } from '../../services/daycareAnnualPlanService';
import { ensureDefaultDaycareDonationCampaign } from '../../services/daycareDonationService';
import { syncDaycareOnboardingStepTitles } from '../../services/daycareOnboardingTitleSyncService';
const actions:Record<string,()=>Promise<unknown>>={
 'shifra-indexes':async()=>Promise.all([ShifraPuaRegistration.createIndexes(),ShifraPuaWeek.createIndexes(),ShifraPuaRecipe.createIndexes(),ShifraPuaSavedMenu.createIndexes()]),
 'onboarding-indexes':ensureDaycareOnboardingIndexes,'agreement-indexes':ensureDaycareAgreementIndexes,'payment-indexes':ensureDaycarePaymentStorage,
 'agreement-draft':ensureDefaultAgreementDraft,'parent-documents':ensureDefaultParentDocumentYear,'annual-plan':ensureDefaultDaycareAnnualPlan,
 'donation-campaign':ensureDefaultDaycareDonationCampaign,'step-titles':syncDaycareOnboardingStepTitles,
 'agreement-reconciliation':reconcileAgreementOnboardingSteps,'parent-snapshots':backfillParentDocumentSnapshots,
};
const router=Router();
router.post('/maintenance/:action',requireAdmin,requireSecureAdminMutation,async(req,res)=>{
 const action=actions[req.params.action];
 if (!Object.prototype.hasOwnProperty.call(actions,req.params.action)||!action||req.body?.confirmation!==`CONFIRM_${req.params.action}`) return res.status(400).json({success:false,message:'Explicit maintenance action and confirmation required'});
 try {await withMaintenanceAuthorization(action);return res.json({success:true});}
 catch{return res.status(500).json({success:false,message:'Maintenance failed'});}
});
export {router as maintenanceRoutes};
