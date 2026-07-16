import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { downloadBlankPublicDaycareHealthDeclaration, downloadPublicDaycareHealthDeclaration, getPublicDaycareHealthDeclaration, submitPublicDaycareHealthDeclaration, uploadPublicDaycareHealthDeclaration } from "../../../services/daycareHealthDeclarationService";
import type { DaycareHealthDeclarationPayload, DaycareHealthSignerRole, PublicDaycareHealthDeclaration } from "../../../types/daycareHealthDeclaration";
import styles from "./HealthDeclarationSection.module.scss";

type Props = { token: string; onSubmitted: () => void };
const healthFunds = ["כללית", "מכבי", "מאוחדת", "לאומית", "אחר"];
const statusLabels = { pendingReview: "ממתין לבדיקת המעון", completed: "התקבל ואושר", requiresCorrection: "נדרש תיקון" };
const canvasToBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("empty signature")), "image/png"));
const messageFromError = (error: unknown) => axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || "לא הצלחנו לשלוח את ההצהרה." : "לא הצלחנו לשלוח את ההצהרה.";

const HealthDeclarationSection = ({ token, onSubmitted }: Props) => {
    const [data, setData] = useState<PublicDaycareHealthDeclaration | null>(null);
    const [healthCondition, setHealthCondition] = useState("");
    const [medicationSensitivities, setMedicationSensitivities] = useState("");
    const [healthFund, setHealthFund] = useState("");
    const [hasAllergies, setHasAllergies] = useState(false);
    const [allergyDetails, setAllergyDetails] = useState("");
    const [exposureInstructions, setExposureInstructions] = useState("");
    const [signedBy, setSignedBy] = useState("");
    const [signerRole, setSignerRole] = useState<DaycareHealthSignerRole>("mother");
    const [informationConfirmed, setInformationConfirmed] = useState(false);
    const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);

    const applyPayload = useCallback((payload?: DaycareHealthDeclarationPayload) => {
        if (!payload) return;
        setHealthCondition(payload.healthCondition);
        setMedicationSensitivities(payload.medicationSensitivities);
        setHealthFund(payload.healthFund);
        setHasAllergies(payload.hasAllergies);
        setAllergyDetails(payload.allergyDetails ?? "");
        setExposureInstructions(payload.exposureInstructions ?? "");
        setSignedBy(payload.signedBy);
        setSignerRole(payload.signerRole);
    }, []);
    const load = useCallback(async () => {
        const next = await getPublicDaycareHealthDeclaration(token);
        setData(next);
        if (next.available) applyPayload(next.declaration?.payload);
    }, [applyPayload, token]);
    useEffect(() => {
        let active = true;
        void getPublicDaycareHealthDeclaration(token).then((next) => {
            if (!active) return;
            setData(next);
            if (next.available) applyPayload(next.declaration?.payload);
        }).catch(() => { if (active) setData(null); });
        return () => { active = false; };
    }, [applyPayload, token]);

    if (!data?.available) return null;
    const declaration = data.declaration;
    const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width), y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height) };
    };
    const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const context = event.currentTarget.getContext("2d"); if (!context) return;
        event.currentTarget.setPointerCapture(event.pointerId); const current = point(event);
        context.beginPath(); context.moveTo(current.x, current.y); context.strokeStyle = "#143a63"; context.lineWidth = 3; context.lineCap = "round"; drawingRef.current = true;
    };
    const draw = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawingRef.current) return; const context = event.currentTarget.getContext("2d"); if (!context) return; const current = point(event); context.lineTo(current.x, current.y); context.stroke(); setHasSignature(true); };
    const stop = () => { drawingRef.current = false; };
    const clear = () => { const canvas = canvasRef.current; canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false); };
    const validationError = !healthCondition.trim()
        ? "יש למלא את המצב הבריאותי."
        : !medicationSensitivities.trim()
          ? "יש למלא רגישויות לתרופות, או לכתוב שאין."
          : !healthFund
            ? "יש לבחור קופת חולים."
            : hasAllergies && (!allergyDetails.trim() || !exposureInstructions.trim())
              ? "יש להשלים את פרטי האלרגיה והנחיות החשיפה."
              : !signedBy.trim()
                ? "יש למלא את השם המלא של החותם/ת."
                : !informationConfirmed
                  ? "יש לאשר שהמידע שנמסר נכון ומלא."
                  : !responsibilityAccepted
                    ? "יש לאשר את סעיף האחריות למידע הרפואי."
                    : !hasSignature
                      ? "יש לחתום באמצעות העכבר או האצבע."
                      : "";

    const submit = async () => {
        if (!canvasRef.current) return;
        setError(""); setNotice("");
        if (validationError) { setError(validationError); return; }
        setBusy(true);
        try {
            const signature = await canvasToBlob(canvasRef.current);
            await submitPublicDaycareHealthDeclaration(token, { healthCondition: healthCondition.trim(), medicationSensitivities: medicationSensitivities.trim(), healthFund, hasAllergies, allergyDetails: hasAllergies ? allergyDetails.trim() : undefined, exposureInstructions: hasAllergies ? exposureInstructions.trim() : undefined, informationConfirmed: true, allergyResponsibilityAccepted: true, signedBy: signedBy.trim(), signerRole }, signature);
            setNotice("הצהרת הבריאות נשלחה וממתינה לבדיקת צוות המעון.");
            await load(); onSubmitted();
        } catch (submitError) { setError(messageFromError(submitError)); }
        finally { setBusy(false); }
    };
    const download = async () => { const blob = await downloadPublicDaycareHealthDeclaration(token); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "הצהרת-בריאות-חתומה.pdf"; anchor.click(); URL.revokeObjectURL(url); };
    const downloadBlank = async () => {
        setError("");
        try { const blob = await downloadBlankPublicDaycareHealthDeclaration(token); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "הצהרת-בריאות-למילוי-ידני.pdf"; anchor.click(); URL.revokeObjectURL(url); }
        catch (downloadError) { setError(messageFromError(downloadError)); }
    };
    const uploadManual = async (file?: File) => {
        if (!file) return;
        setBusy(true); setError(""); setNotice("");
        try { await uploadPublicDaycareHealthDeclaration(token, file); setNotice("ההצהרה החתומה הועלתה וממתינה לבדיקת צוות המעון."); await load(); onSubmitted(); }
        catch (uploadError) { setError(messageFromError(uploadError)); }
        finally { setBusy(false); }
    };

    return <section className={styles.card} aria-labelledby="health-declaration-title">
        <header className={styles.header}><div><span className={styles.eyebrow}>שלב הבריאות</span><h2 className={styles.title} id="health-declaration-title">הצהרת בריאות</h2><p className={styles.intro}>יש למלא מידע עדכני על בריאות הילד/ה, אלרגיות ורגישויות ולחתום בסיום.</p></div>{declaration ? <span className={styles.status}>{statusLabels[declaration.status]}</span> : null}</header>
        {declaration?.parentMessage ? <p className={styles.correction}>{declaration.parentMessage}</p> : null}
        {data.canSubmit ? <div className={styles.form}>
            <details className={styles.manualOption}>
                <summary className={styles.manualSummary}>מעדיפים למלא ולחתום ידנית?</summary>
                <div className={styles.manualContent}>
                    <p className={styles.helper}>הורידו את הטופס, הדפיסו ומלאו אותו, ולאחר החתימה העלו PDF או צילום ברור.</p>
                    <div className={styles.actions}>
                        <button className={styles.secondary} type="button" disabled={busy} onClick={() => void downloadBlank()}>הורדת טופס להדפסה</button>
                        <label className={styles.uploadLabel}>העלאת טופס חתום<input className={styles.fileInput} type="file" accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png" disabled={busy} onChange={(event) => void uploadManual(event.target.files?.[0])} /></label>
                    </div>
                    <span className={styles.helper}>PDF, JPG או PNG עד 10MB</span>
                </div>
            </details>
            <div className={styles.section}><h3 className={styles.sectionTitle}>בריאות הילד/ה</h3><div className={styles.grid}>
                <label className={`${styles.label} ${styles.wide}`}>מצב בריאותי<textarea className={styles.textarea} value={healthCondition} onChange={(e) => setHealthCondition(e.target.value)} placeholder="אם המצב תקין, יש לכתוב: תקין" /></label>
                <label className={styles.label}>רגישויות לתרופות<input className={styles.input} value={medicationSensitivities} onChange={(e) => setMedicationSensitivities(e.target.value)} placeholder="אם אין, יש לכתוב: אין" /></label>
                <label className={styles.label}>קופת חולים<select className={styles.select} value={healthFund} onChange={(e) => setHealthFund(e.target.value)}><option value="">בחירה</option>{healthFunds.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div></div>
            <div className={styles.section}><h3 className={styles.sectionTitle}>אלרגיות ורגישויות</h3><div className={styles.radioRow}><label className={styles.radio}><input type="radio" checked={!hasAllergies} onChange={() => setHasAllergies(false)} />אין אלרגיה או רגישות ידועה</label><label className={styles.radio}><input type="radio" checked={hasAllergies} onChange={() => setHasAllergies(true)} />קיימת אלרגיה או רגישות</label></div>{hasAllergies ? <div className={styles.grid}><label className={styles.label}>למה הילד/ה רגיש/ה?<textarea className={styles.textarea} value={allergyDetails} onChange={(e) => setAllergyDetails(e.target.value)} /></label><label className={styles.label}>מה יש לעשות במקרה של חשיפה?<textarea className={styles.textarea} value={exposureInstructions} onChange={(e) => setExposureInstructions(e.target.value)} /></label></div> : null}</div>
            <div className={styles.section}><h3 className={styles.sectionTitle}>הצהרה וחתימה</h3><label className={styles.consent}><input type="checkbox" checked={informationConfirmed} onChange={(e) => setInformationConfirmed(e.target.checked)} />אני מאשר/ת שהמידע שמסרתי נכון ומלא ומתחייב/ת לעדכן את המעון בכל שינוי.</label><label className={styles.consent}><input type="checkbox" checked={responsibilityAccepted} onChange={(e) => setResponsibilityAccepted(e.target.checked)} />ידוע לי כי האחריות למסירת מידע מלא ועדכני ולהשלכות הנובעות מאי-מסירתו חלה עליי.</label><div className={styles.grid}><label className={styles.label}>שם מלא של החותם/ת<input className={styles.input} value={signedBy} onChange={(e) => setSignedBy(e.target.value)} /></label><label className={styles.label}>תפקיד<select className={styles.select} value={signerRole} onChange={(e) => setSignerRole(e.target.value as DaycareHealthSignerRole)}><option value="mother">אם</option><option value="father">אב</option><option value="guardian">אפוטרופוס/ית</option></select></label></div><span className={styles.helper}>חתימה באמצעות העכבר או האצבע</span><canvas ref={canvasRef} className={styles.signatureCanvas} width="700" height="220" onPointerDown={start} onPointerMove={draw} onPointerUp={stop} onPointerCancel={stop} /><div className={styles.actions}><button className={styles.secondary} type="button" onClick={clear}>ניקוי חתימה</button><button className={styles.primary} type="button" disabled={busy} onClick={() => void submit()}>{busy ? "שולח..." : declaration ? "שליחת הצהרה מתוקנת" : "חתימה ושליחת ההצהרה"}</button></div></div>
        </div> : declaration ? <div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => void download()}>הורדת ההצהרה החתומה</button></div> : null}
        <div aria-live="polite">{notice ? <p className={styles.success}>{notice}</p> : null}{error ? <p className={styles.error}>{error}</p> : null}</div>
    </section>;
};

export default HealthDeclarationSection;
