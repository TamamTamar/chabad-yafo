// Explicit synthetic fixtures, permitted only on a fresh runner-owned development DB.
const assert = require('node:assert/strict'); const fs = require('node:fs'); const crypto = require('node:crypto');
const mongoose = require('mongoose'); const { connectDB } = require('../dist/config/connectDB');
const model = name => require('../dist/models/' + name)[name];
(async () => {
    try {
        const manifest = JSON.parse(fs.readFileSync(process.env.SAFE_MONGO_MANIFEST)); assert.equal(manifest.mode, 'development'); await connectDB();
        const db = mongoose.connection.db; assert.equal(mongoose.connection.name, manifest.database); const marker = await db.collection('__runtime_identity').findOne({ _id: 'managed-runtime' }); assert.equal(marker.nonce, manifest.nonce);
        assert.deepEqual((await db.listCollections().toArray()).map(x => x.name), ['__runtime_identity'], 'pilot requires a fresh database');
        const origin = process.env.CLIENT_ORIGIN; const api = process.env.SAFE_API_ORIGIN; assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/); assert.match(api, /^http:\/\/127\.0\.0\.1:\d+$/);
        const proof = await (await fetch(api + '/__safe-runtime')).json(); assert.equal(proof.proof, crypto.createHash('sha256').update(manifest.nonce).digest('hex'));
        const { withMaintenanceAuthorization } = require('../dist/config/maintenanceAuthorization');
        const { ensureDefaultParentDocumentYear } = require('../dist/services/daycareParentDocumentService');
        const { buildDefaultAgreementDraft } = require('../dist/services/daycareAgreementService');
        await withMaintenanceAuthorization(ensureDefaultParentDocumentYear);
        const draft = buildDefaultAgreementDraft(); const version = await model('DaycareAgreementVersion').create({ ...draft, title: 'הסכם לדוגמה בלבד - פיילוט', status: 'published', publishedAt: new Date() });
        const { createDefaultOnboarding, calculateOverallStatus } = require('../dist/services/daycareOnboardingService');
        const { getDaycareStorageProvider } = require('../dist/services/daycareStorageService'); const PDFDocument = require('pdfkit');
        const pdf = await new Promise(resolve => { const chunks = []; const doc = new PDFDocument(); doc.on('data', b => chunks.push(b)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.text('SYNTHETIC PILOT DOCUMENT - NO LEGAL OR PAYMENT EFFECT'); doc.end(); });
        const specs = [['נועה', 'חדשה', 'מתעניין'], ['אורי', 'ממתין למענה', 'מתעניין'], ['מיה', 'לאחר שיחה', 'שיחה בוצעה'], ['איתן', 'מוכן לפתיחת תיק', 'רוצה להירשם'], ['תמר', 'ביקרה במעון', 'הגיע לראות'], ['ליה', 'תיק חלקי', 'רוצה להירשם', 'partial'], ['אדם', 'מסמכים לבדיקה', 'רוצה להירשם', 'review'], ['יעל', 'בקשת תיקון', 'רוצה להירשם', 'correction'], ['דניאל', 'תיק שהושלם', 'נרשם', 'complete'], ['רון', 'פנייה סגורה', 'לא רלוונטי']];
        for (const [i, [name, scenario, status, kind]] of specs.entries()) {
            const phone = '05000000' + String(i).padStart(2, '0');
            const registration = await model('DaycareRegistration').create({ parentName: 'הורה לדוגמה ' + name, childName: name + ' - ' + scenario, phone, email: 'pilot' + i + '@example.invalid', childAge: 'שנתיים', requiredHours: 'עד 15:30', status, callNotes: scenario + ' · נתונים מדומים בלבד' });
            if (!kind) continue;
            const family = await model('DaycareFamily').create({ guardians: [{ fullName: 'הורה לדוגמה ' + name, role: 'mother', phone, email: 'pilot' + i + '@example.invalid' }], address: { city: 'עיר לדוגמה', street: 'רחוב בדיקה', houseNumber: String(i + 1) } });
            const child = await model('DaycareChild').create({ familyId: family._id, firstName: name, lastName: 'בדיקה', birthDate: new Date('2024-02-29') });
            const bundle = createDefaultOnboarding({ familyId: family._id, childId: child._id, schoolYear: '2026-2027', origin: { type: 'daycareRegistration', recordId: registration._id }, profileStatus: 'complete', internalNote: 'תיק פיילוט מדומה - ' + scenario });
            const data = bundle.onboarding;
            for (const step of data.steps) { if (step.key === 'onboardingOpened') continue; step.status = kind === 'complete' ? 'completed' : kind === 'partial' ? (step.key === 'childAndGuardianDetails' ? 'completed' : 'notStarted') : ['childAndGuardianDetails', 'agreementSigned', 'healthDeclarationSubmitted', 'pickupAuthorizationSubmitted'].includes(step.key) ? 'pendingReview' : 'notStarted'; if (kind === 'correction' && step.key === 'healthDeclarationSubmitted') { step.status = 'requiresCorrection'; step.parentMessage = 'בדיקה בלבד: יש לעדכן את פרטי הרגישויות ולשלוח מחדש.'; } if (step.status === 'completed') step.completedAt = new Date(); }
            if (kind !== 'partial') data.parentSubmittedAt = new Date();
            if (kind === 'complete') { data.standingOrderStatus = 'active'; data.standingOrderTransactionId = 'PILOT-NO-REAL-CHARGE'; data.standingOrderEstablishedAt = new Date(); }
            data.monthlyTuitionAmount = 2500; data.overallStatus = calculateOverallStatus(data.steps);
            const onboarding = await model('DaycareOnboarding').create(data);
            await model('DaycareRegistration').updateOne({ _id: registration._id }, { $set: { daycareFamilyId: family._id, daycareChildId: child._id } });
            if (kind === 'partial') continue;
            const stored = await getDaycareStorageProvider().upload({ bytes: pdf, mimeType: 'application/pdf', originalName: 'pilot-synthetic.pdf', category: 'health-declarations' });
            const common = { onboardingId: onboarding._id, documentId: crypto.randomUUID(), revision: 1, formVersion: 'pilot.1', status: kind === 'complete' ? 'completed' : 'pendingReview', signingMethod: 'uploadedFile', contentHash: 'a'.repeat(64), submittedAt: new Date(), signedPdfFile: stored };
            await model('DaycareHealthDeclaration').create({ ...common, ...(kind === 'correction' ? { status: 'requiresCorrection', parentMessage: 'יש לעדכן את פרטי הרגישויות - תרגיל פיילוט בלבד' } : {}) });
            await model('DaycarePickupAuthorization').create({ ...common, documentId: crypto.randomUUID() });
            await model('DaycareAgreement').create({ onboardingId: onboarding._id, revision: 1, versionId: version._id, documentId: crypto.randomUUID(), documentKey: 'daycareAgreement', version: version.version, status: kind === 'complete' ? 'completed' : 'pendingReview', signingMethod: 'uploadedPdf', signedBy: 'הורה מדומה', signedAt: new Date(), signedPdfFile: stored });
        }
        // Assert usable authenticated API before declaring readiness; never print credentials/token.
        const login = await fetch(api + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) }); assert.equal(login.status, 200); const { token } = await login.json();
        const list = await fetch(api + '/api/admin/daycare/registrations', { headers: { Authorization: 'Bearer ' + token } }); assert.equal(list.status, 200);
        assert.equal(await model('DaycareRegistration').countDocuments(), 10); assert.equal(await model('DaycareOnboarding').countDocuments(), 4);
        console.log('Pilot fixtures verified: 10 synthetic inquiries, 4 cases, local sample PDFs, partial/review/correction/completed states. Real providers disabled.');
    } finally { await mongoose.disconnect(); }
})().catch(e => { console.error('Pilot preparation failed:', e.name); process.exitCode = 1; });
