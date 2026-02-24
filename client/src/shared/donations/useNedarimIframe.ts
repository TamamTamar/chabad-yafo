import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type TransactionStatus = "Error" | "Ok" | string;

type UseNedarimIframeArgs = {
  enabled: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onSuccess?: () => void;
};

export const useNedarimIframe = ({ enabled, iframeRef, onSuccess }: UseNedarimIframeArgs) => {
  const [isReady, setIsReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [ok, setOk] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  const timeoutRef = useRef<number | null>(null);

  const postToIframe = useCallback(
    (data: object) => {
      const win = iframeRef.current?.contentWindow;
      if (win) win.postMessage(data, "*");
    },
    [iframeRef]
  );

  useEffect(() => {
    if (!enabled) return;

    const onMessage = (event: MessageEvent) => {
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
            if (onSuccess) window.setTimeout(() => onSuccess(), 1200);
          }
          break;
        }

        default:
          break;
      }
    };

    const onIframeLoad = () => postToIframe({ Name: "GetHeight" });

    window.addEventListener("message", onMessage);
    iframeRef.current?.addEventListener("load", onIframeLoad);

    return () => {
      window.removeEventListener("message", onMessage);
      iframeRef.current?.removeEventListener("load", onIframeLoad);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [enabled, iframeRef, onSuccess, postToIframe]);

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

      win.postMessage({ Name: "FinishTransaction2", Value: payload }, "*");

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setIsPaying(false);
        setErrorText("לא התקבלה תשובה מהשרת. נסי שוב או פני לתמיכה.");
      }, 20000);
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