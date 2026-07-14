import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    downloadPublicDaycareAgreementPdf,
    getPublicDaycareAgreement,
    downloadPublicSignedAgreement,
    signPublicDaycareAgreement,
    uploadPublicSignedAgreementPdf,
} from "../../../services/daycareAgreementService";
import daycareLogo from "../../../assets/logo-maon.jpeg";
import type { PublicDaycareAgreement } from "../../../types/daycareAgreement";
import type { DaycareDocumentBlock } from "../../../types/daycareAgreement";
import styles from "../DaycareOnboarding.module.scss";

interface AgreementSectionProps {
    token: string;
    onSubmitted: () => void;
}

const messageFromError = (error: unknown) =>
    axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || "לא הצלחנו לשמור את ההסכם."
        : "לא הצלחנו לשמור את ההסכם.";

const canvasToBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Signature is empty")), "image/png");
    });

const AgreementBlock = ({ block }: { block: DaycareDocumentBlock }) => {
    if (block.type === "paragraph") return <p className={styles.documentParagraph}>{block.text}</p>;
    const ListTag = block.type === "numberedList" ? "ol" : "ul";
    return <ListTag className={styles.documentList}>{block.items.map(item => <li key={item.id} className={styles.documentListItem}>{item.text}</li>)}</ListTag>;
};

const AgreementSection = ({ token, onSubmitted }: AgreementSectionProps) => {
    const [agreement, setAgreement] = useState<PublicDaycareAgreement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [signedBy, setSignedBy] = useState("");
    const [signerRole, setSignerRole] = useState<"mother" | "father" | "guardian">("mother");
    const [signerIsraeliId, setSignerIsraeliId] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);

    const load = useCallback(
        () => getPublicDaycareAgreement(token).then(setAgreement).catch(() => setAgreement(null)),
        [token]
    );
    useEffect(() => { void load(); }, [load]);

    if (!agreement?.available) return null;
    const canSubmitOnline =
        agreement.signingAvailable &&
        !agreement.agreement;
    const canUploadPdf = agreement.signingAvailable && (
        !agreement.agreement ||
        (agreement.agreement.signingMethod === "uploadedPdf" && agreement.agreement.status === "requiresCorrection")
    );
    const agreementStatusLabel = agreement.agreement?.status === "completed"
        ? "התקבל ואושר"
        : agreement.agreement?.status === "requiresCorrection"
          ? "נדרש תיקון"
          : "ממתין לבדיקת המעון";

    const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = event.currentTarget;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.setPointerCapture(event.pointerId);
        const current = point(event);
        context.beginPath();
        context.moveTo(current.x, current.y);
        context.strokeStyle = "#143a63";
        context.lineWidth = 3;
        context.lineCap = "round";
        drawingRef.current = true;
    };

    const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const context = event.currentTarget.getContext("2d");
        if (!context) return;
        const current = point(event);
        context.lineTo(current.x, current.y);
        context.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => { drawingRef.current = false; };
    const clearSignature = () => {
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const submitOnline = async () => {
        if (!canvasRef.current || !hasSignature || !accepted || !signedBy.trim()) return;
        setIsBusy(true); setError(""); setNotice("");
        try {
            const signature = await canvasToBlob(canvasRef.current);
            await signPublicDaycareAgreement(token, { signedBy, signerRole, signerIsraeliId, signature });
            setNotice("ההסכם נחתם ונשלח בהצלחה. הוא ממתין כעת לאישור צוות המעון.");
            await load();
            onSubmitted();
        } catch (submitError) { setError(messageFromError(submitError)); }
        finally { setIsBusy(false); }
    };

    const downloadSignedCopy = async () => {
        setIsBusy(true); setError(""); setNotice("");
        try {
            const blob = await downloadPublicSignedAgreement(token);
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = "הסכם-התקשרות-חתום.pdf";
            anchor.click();
            URL.revokeObjectURL(objectUrl);
        } catch (downloadError) { setError(messageFromError(downloadError)); }
        finally { setIsBusy(false); }
    };

    const uploadPdf = async (file?: File) => {
        if (!file) return;
        setIsBusy(true); setError(""); setNotice("");
        try {
            await uploadPublicSignedAgreementPdf(token, file);
            setNotice("ה־PDF החתום התקבל וממתין לאישור צוות המעון.");
            await load();
            onSubmitted();
        } catch (uploadError) { setError(messageFromError(uploadError)); }
        finally { setIsBusy(false); }
    };

    const downloadAgreementPdf = async () => {
        setIsBusy(true); setError(""); setNotice("");
        try {
            const blob = await downloadPublicDaycareAgreementPdf(token);
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = `הסכם-התקשרות-${agreement.version.schoolYear}.pdf`;
            anchor.click();
            URL.revokeObjectURL(objectUrl);
        } catch (downloadError) { setError(messageFromError(downloadError)); }
        finally { setIsBusy(false); }
    };

    return (
        <section className={styles.agreementCard} aria-labelledby="agreement-title">
            <div className={styles.agreementHeader}>
                <div>
                    <span className={styles.agreementEyebrow}>השלב הבא</span>
                    <h2 id="agreement-title" className={styles.agreementTitle}>הסכם התקשרות</h2>
                    <p className={styles.agreementIntro}>אפשר לבצע אישור וחתימה מקוונת, או להדפיס ולהעלות עותק חתום.</p>
                </div>
                {agreement.agreement ? <span className={styles.agreementStatus}>{agreementStatusLabel}</span> : null}
            </div>

            <div className={styles.agreementActions}>
                <button className={styles.agreementPrimaryButton} type="button" onClick={() => setIsOpen((value) => !value)}>
                    {isOpen ? "סגירת ההסכם" : "קריאה וחתימה מקוונות"}
                </button>
                <button className={styles.agreementSecondaryButton} type="button" disabled={isBusy} onClick={() => void downloadAgreementPdf()}>
                    הורדת ההסכם כ־PDF
                </button>
                {agreement.agreement?.hasSignedPdf && agreement.agreement.signingMethod === "online" ? (
                    <button className={styles.agreementSecondaryButton} type="button" disabled={isBusy} onClick={() => void downloadSignedCopy()}>
                        הורדת ההסכם החתום
                    </button>
                ) : null}
            </div>

            <article className={`${styles.agreementPrintArea} ${isOpen ? styles.agreementPrintAreaOpen : ""}`}>
                <div className={styles.agreementDocumentHeader}>
                    <img className={styles.agreementDocumentLogo} src={daycareLogo} alt="לוגו מעון חב״ד יפו" />
                    <div>
                        <strong>מעון חב״ד יפו</strong>
                        <span>יוסי בן יוסי 1, יפו · 054-219-3770</span>
                    </div>
                </div>
                <h2 className={styles.printTitle}>{agreement.version.title}</h2>
                {agreement.version.subtitle ? <p className={styles.documentSubtitle}>{agreement.version.subtitle}</p> : null}
                <p className={styles.printVersion}>גרסה {agreement.version.version} · שנת לימודים {agreement.version.schoolYear}</p>
                <div className={styles.agreementContent}>
                    <div className={styles.documentIntro}>{agreement.version.intro.map(block => <AgreementBlock key={block.id} block={block} />)}</div>
                    {agreement.version.sections.map((section, index) => (
                        <section key={section.id} className={styles.documentSection}>
                            <h3 className={styles.documentSectionTitle}>{index + 1}. {section.title}</h3>
                            {section.blocks.map(block => <AgreementBlock key={block.id} block={block} />)}
                        </section>
                    ))}
                </div>
            </article>

            {isOpen && canSubmitOnline ? (
                <div className={styles.signatureForm}>
                    <label className={styles.profileLabel}>שם מלא של החותם<input className={styles.profileInput} value={signedBy} onChange={(event) => setSignedBy(event.target.value)} /></label>
                    <label className={styles.profileLabel}>תפקיד<select className={styles.profileSelect} value={signerRole} onChange={(event) => setSignerRole(event.target.value as "mother" | "father" | "guardian")}><option value="mother">אם</option><option value="father">אב</option><option value="guardian">אפוטרופוס/ית</option></select></label>
                    <label className={styles.profileLabel}>מספר תעודת זהות של החותם<input className={styles.profileInput} value={signerIsraeliId} inputMode="numeric" autoComplete="off" maxLength={9} onChange={(event) => setSignerIsraeliId(event.target.value.replace(/\D/g, "").slice(0, 9))} /></label>
                    <div className={styles.signatureField}>
                        <span className={styles.signatureLabel}>חתימה באמצעות העכבר או האצבע</span>
                        <canvas ref={canvasRef} className={styles.signatureCanvas} width="700" height="220" aria-label="אזור לציור חתימה" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} />
                        <button className={styles.clearSignatureButton} type="button" onClick={clearSignature}>ניקוי חתימה</button>
                    </div>
                    <label className={styles.acceptLabel}><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />{agreement.acceptanceStatement}</label>
                    <button className={styles.agreementPrimaryButton} type="button" disabled={isBusy || !accepted || !signedBy.trim() || signerIsraeliId.length !== 9 || !hasSignature} onClick={() => void submitOnline()}>{isBusy ? "מאשר ושומר..." : "אישור וחתימה על ההסכם"}</button>
                </div>
            ) : null}

            {agreement.agreement?.parentMessage ? (
                <p className={styles.profileError}>{agreement.agreement.parentMessage}</p>
            ) : null}
            {canUploadPdf ? (
                <label className={styles.pdfUploadLabel}>או העלאת הסכם חתום כ־PDF<input className={styles.pdfInput} type="file" accept="application/pdf,.pdf" disabled={isBusy} onChange={(event) => void uploadPdf(event.target.files?.[0])} /></label>
            ) : null}
            <div className={styles.agreementFeedback} aria-live="polite">
                {notice ? <p className={styles.profileSuccess}>{notice}</p> : null}
                {error ? <p className={styles.profileError}>{error}</p> : null}
                {!agreement.signingAvailable ? <p className={styles.profileError}>מנגנון החתימה המאובטח טרם הוגדר. אפשר לקרוא ולהדפיס, אך אישור וחתימה מקוונת אינם זמינים כרגע.</p> : null}
            </div>
        </section>
    );
};

export default AgreementSection;
