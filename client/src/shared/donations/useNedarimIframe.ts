import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type TransactionStatus = "Error" | "Ok" | string;

type UseNedarimIframeArgs = {
  enabled: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onSuccess?: () => void;
  successDelay?: number; // הוספנו אפשרות לשלוט בזמן הסגירה
};

const NEDARIM_ORIGINS = new Set([
  "https://matara.pro",
  "https://www.matara.pro",
]);

export const useNedarimIframe = ({ 
  enabled, 
  iframeRef, 
  onSuccess, 
  successDelay = 4000 // ברירת מחדל של 4 שניות במקום 1.2
}: UseNedarimIframeArgs) => {
  const [isReady, setIsReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [ok, setOk] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  const timeoutRef = useRef<number | null>(null);

  const postToIframe = useCallback(
    (data: object) => {
      const win = iframeRef.current?.contentWindow;
      const origin = iframeRef.current?.src
        ? new URL(iframeRef.current.src).origin
        : "";
      if (win && NEDARIM_ORIGINS.has(origin)) win.postMessage(data, origin);
    },
    [iframeRef]
  );

  useEffect(() => {
    if (!enabled) return;

    const onMessage = (event: MessageEvent) => {
      if (!NEDARIM_ORIGINS.has(event.origin)) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      switch (data.Name) {
        case "Height": {
          const nextH = Number.parseInt(String(data.Value), 10);
          if (iframeRef.current && Number.isFinite(nextH)) {
            iframeRef.current.style.height = `${nextH + 15}px`;
          }
          setIsReady(true);
          break;
        }

        case "TransactionResponse": {
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          setIsPaying(false);

          const status: TransactionStatus = data.Value?.Status;
          setStatusText(status ? `סטטוס: ${status}` : "סטטוס התקבל");

          if (status === "Error") {
            setOk(false);
            setErrorText(data.Value?.Message ? `שגיאה: ${data.Value.Message}` : "שגיאה בתשלום");
          } else {
            setErrorText("");
            setOk(true);
            // כאן השינוי המרכזי: שימוש ב-successDelay שניתן לשליטה
            if (onSuccess) {
              window.setTimeout(() => {
                onSuccess();
              }, successDelay);
            }
          }
          break;
        }

        default:
          break;
      }
    };

    const onIframeLoad = () => postToIframe({ Name: "GetHeight" });
    const iframe = iframeRef.current;

    window.addEventListener("message", onMessage);
    iframe?.addEventListener("load", onIframeLoad);

    return () => {
      window.removeEventListener("message", onMessage);
      iframe?.removeEventListener("load", onIframeLoad);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [enabled, iframeRef, onSuccess, postToIframe, successDelay]);

  const startPayment = useCallback(
    (payload: object) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) {
        setErrorText("הטופס לא נטען. נסי לרענן.");
        return;
      }

      setErrorText("");
      setStatusText("");
      setOk(false);
      setIsPaying(true);

      const origin = iframeRef.current?.src
        ? new URL(iframeRef.current.src).origin
        : "";
      if (!NEDARIM_ORIGINS.has(origin)) {
        setIsPaying(false);
        setErrorText("חלון התשלום אינו זמין כרגע.");
        return;
      }
      win.postMessage({ Name: "FinishTransaction2", Value: payload }, origin);

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setIsPaying(false);
        setErrorText("לא התקבלה תשובה מהשרת. נסי שוב או פני לתמיכה.");
      }, 25000); // הגדלתי מעט ל-25 שניות לביטחון
    },
    [iframeRef]
  );

  const resetPaymentUi = useCallback(() => {
    setIsReady(false);
    setIsPaying(false);
    setOk(false);
    setStatusText("");
    setErrorText("");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  return {
    postToIframe,
    startPayment,
    resetPaymentUi,
    isReady,
    isPaying,
    ok,
    statusText,
    errorText,
    setErrorText,
  };
};
