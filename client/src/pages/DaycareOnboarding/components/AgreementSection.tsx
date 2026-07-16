import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
import { tokenParentDocumentPdfUrl } from "../../../services/daycareParentDocumentService";

interface AgreementSectionProps {
    token: string;
    onSubmitted: () => void;
}

type AgreementSignatureFormValues = {
    signedBy: string;
    signerRole: "mother" | "father" | "guardian";
    signerIsraeliId: string;
    accepted: boolean;
    parentInfoAccepted: boolean;
    signatureDataUrl: string;
};

const isValidIsraeliId = (value: string) => {
    const normalized = value.replace(/\D/g, "").padStart(9, "0");
    if (!/^\d{9}$/.test(normalized)) return false;

    const sum = [...normalized].reduce((total, character, index) => {
        const multiplied = Number(character) * ((index % 2) + 1);
        return total + (multiplied > 9 ? multiplied - 9 : multiplied);
    }, 0);

    return sum % 10 === 0;
};

const messageFromError = (error: unknown) =>
    axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || "לא הצלחנו לשמור את ההסכם."
        : "לא הצלחנו לשמור את ההסכם.";

const signatureDataUrlToBlob = (signatureDataUrl: string) => {
    const [metadata, encodedData] = signatureDataUrl.split(",");
    const mimeType = metadata.match(/^data:(.*?);base64$/)?.[1] ?? "image/png";
    const binaryData = atob(encodedData);
    const bytes = new Uint8Array(binaryData.length);

    for (let index = 0; index < binaryData.length; index += 1) {
        bytes[index] = binaryData.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
};

const AgreementBlock = ({ block }: { block: DaycareDocumentBlock }) => {
    if (block.type === "paragraph") return <p className={styles.documentParagraph}>{block.text}</p>;
    const ListTag = block.type === "numberedList" ? "ol" : "ul";
    return <ListTag className={styles.documentList}>{block.items.map(item => <li key={item.id} className={styles.documentListItem}>{item.text}</li>)}</ListTag>;
};

const AgreementSection = ({ token, onSubmitted }: AgreementSectionProps) => {
    const [agreement, setAgreement] = useState<PublicDaycareAgreement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const signatureDrawnRef = useRef(false);
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<AgreementSignatureFormValues>({
        defaultValues: {
            signedBy: "",
            signerRole: "mother",
            signerIsraeliId: "",
            accepted: false,
            parentInfoAccepted: false,
            signatureDataUrl: "",
        },
    });

    const load = useCallback(
        () => getPublicDaycareAgreement(token).then(setAgreement).catch(() => setAgreement(null)),
        [token]
    );
    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        register("signatureDataUrl", {
            validate: (value) => Boolean(value) || "יש לחתום באמצעות העכבר או האצבע.",
        });
    }, [register]);

    if (!agreement?.available) return null;
    const canSubmitOnline =
        agreement.signingAvailable &&
        agreement.canSubmit;
    const canUploadPdf = agreement.signingAvailable && (
        agreement.canSubmit && (
            !agreement.agreement || agreement.agreement.signingMethod === "uploadedPdf"
        )
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
        signatureDrawnRef.current = true;
    };

    const stopDrawing = () => {
        drawingRef.current = false;
        const canvas = canvasRef.current;
        if (canvas && signatureDrawnRef.current) {
            setValue("signatureDataUrl", canvas.toDataURL("image/png"), {
                shouldValidate: true,
            });
        }
    };
    const clearSignature = () => {
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        signatureDrawnRef.current = false;
        setValue("signatureDataUrl", "", { shouldValidate: true });
    };

    const submitOnline = async (values: AgreementSignatureFormValues) => {
        setIsBusy(true); setError(""); setNotice("");
        try {
            const signature = signatureDataUrlToBlob(values.signatureDataUrl);
            await signPublicDaycareAgreement(token, {
                signedBy: values.signedBy.trim(),
                signerRole: values.signerRole,
                signerIsraeliId: values.signerIsraeliId,
                signature,
                parentDocumentsAccepted: values.parentInfoAccepted,
            });
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
                    <p className={styles.agreementIntro}>{agreement.agreement?.status === "requiresCorrection" ? "צוות המעון ביקש לתקן ולחתום מחדש. הגרסה הקודמת נשמרת בתיק." : agreement.agreement && agreement.canSubmit ? "ההסכם נשמר. עד לשליחה הסופית אפשר לפתוח אותו, לתקן ולחתום מחדש." : agreement.agreement ? "ההסכם והמסמכים להורים נשארים זמינים כאן לצפייה ולהורדה." : "אפשר לבצע אישור וחתימה מקוונת, או להדפיס ולהעלות עותק חתום."}</p>
                </div>
                {agreement.agreement ? <span className={styles.agreementStatus}>{agreementStatusLabel}</span> : null}
            </div>

            <div className={styles.agreementActions}>
                <button className={styles.agreementPrimaryButton} type="button" onClick={() => setIsOpen((value) => !value)}>
                    {isOpen
                        ? "סגירת ההסכם"
                        : agreement.agreement && agreement.canSubmit
                          ? "תיקון וחתימה מחדש"
                          : agreement.agreement
                            ? "צפייה בהסכם"
                            : "קריאה וחתימה מקוונות"}
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

            <aside className={styles.preSigningInfo} aria-labelledby="parent-documents-title">
                <h3 className={styles.preSigningInfoTitle} id="parent-documents-title">מידע ומסמכים להורים</h3>
                <p className={styles.preSigningInfoText}>המסמכים זמינים לצפייה ולהורדה בכל עת, גם לאחר החתימה:</p>
                <div className={styles.preSigningLinks}>
                    <a href={tokenParentDocumentPdfUrl(token, "routine")} target="_blank" rel="noreferrer">צפייה והורדת סדר היום</a>
                    <a href={tokenParentDocumentPdfUrl(token, "holidays")} target="_blank" rel="noreferrer">צפייה והורדת לוח החופשות</a>
                    {agreement.parentDocuments.menuAvailable
                        ? <a href={tokenParentDocumentPdfUrl(token, "menu")} target="_blank" rel="noreferrer">צפייה והורדת התפריט</a>
                        : <span>התפריט יפורסם בהמשך</span>}
                </div>
            </aside>

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
                <form className={styles.signatureForm} noValidate onSubmit={handleSubmit(submitOnline)}>
                    <label className={styles.profileLabel}>
                        שם מלא של החותם
                        <input
                            className={styles.profileInput}
                            aria-invalid={Boolean(errors.signedBy)}
                            {...register("signedBy", {
                                validate: (value) => value.trim().length > 1 || "יש למלא את השם המלא של החותם.",
                            })}
                        />
                        <span className={styles.formFieldError} role="alert">{errors.signedBy?.message || ""}</span>
                    </label>
                    <label className={styles.profileLabel}>
                        תפקיד
                        <select className={styles.profileSelect} {...register("signerRole")}>
                            <option value="mother">אם</option>
                            <option value="father">אב</option>
                            <option value="guardian">אפוטרופוס/ית</option>
                        </select>
                    </label>
                    <label className={styles.profileLabel}>
                        מספר תעודת זהות של החותם
                        <input
                            className={styles.profileInput}
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={9}
                            aria-invalid={Boolean(errors.signerIsraeliId)}
                            {...register("signerIsraeliId", {
                                required: "יש למלא מספר תעודת זהות.",
                                minLength: { value: 9, message: "מספר תעודת זהות חייב לכלול 9 ספרות." },
                                validate: (value) => isValidIsraeliId(value) || "מספר תעודת הזהות אינו תקין.",
                            })}
                            onInput={(event) => {
                                event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 9);
                            }}
                        />
                        <span className={styles.formFieldError} role="alert">{errors.signerIsraeliId?.message || ""}</span>
                    </label>
                    <div className={styles.signatureField}>
                        <span className={styles.signatureLabel}>חתימה באמצעות העכבר או האצבע</span>
                        <canvas ref={canvasRef} className={styles.signatureCanvas} width="700" height="220" aria-label="אזור לציור חתימה" aria-invalid={Boolean(errors.signatureDataUrl)} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} />
                        <button className={styles.clearSignatureButton} type="button" onClick={clearSignature}>ניקוי חתימה</button>
                        <span className={styles.formFieldError} role="alert">{errors.signatureDataUrl?.message || ""}</span>
                    </div>
                    <div>
                        <label className={styles.acceptLabel}><input type="checkbox" {...register("accepted", { required: "יש לאשר שקראת והבנת את ההסכם." })} />{agreement.acceptanceStatement}</label>
                        <span className={styles.formFieldError} role="alert">{errors.accepted?.message || ""}</span>
                    </div>
                    <div>
                        <label className={styles.acceptLabel}><input type="checkbox" {...register("parentInfoAccepted", { required: "יש לאשר שקראת את המידע והמסמכים להורים." })} />קראתי את סדר היום ואת לוח החופשות, וידוע לי שהתפריט יפורסם בהמשך.</label>
                        <span className={styles.formFieldError} role="alert">{errors.parentInfoAccepted?.message || ""}</span>
                    </div>
                    <button className={styles.agreementPrimaryButton} type="submit" disabled={isBusy}>{isBusy ? "מאשר ושומר..." : "אישור וחתימה על ההסכם"}</button>
                </form>
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
