type MetaPixelEventData = Record<string, unknown>;

type FbqFunction = {
    (...args: unknown[]): void;
    callMethod?: (...args: unknown[]) => void;
    queue?: unknown[];
    push?: FbqFunction;
    loaded?: boolean;
    version?: string;
};

declare global {
    interface Window {
        _fbq?: FbqFunction;
        fbq?: FbqFunction;
    }
}

let initializedPixelId: string | null = null;

const createFbq = (): FbqFunction => {
    const fbq: FbqFunction = (...args: unknown[]) => {
        if (fbq.callMethod) {
            fbq.callMethod(...args);
            return;
        }

        fbq.queue?.push(args);
    };

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    return fbq;
};

export const initMetaPixel = (pixelId: string) => {
    const cleanPixelId = pixelId.trim();

    if (!cleanPixelId || initializedPixelId === cleanPixelId) {
        return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
        return;
    }

    if (!window.fbq) {
        window.fbq = createFbq();
        window._fbq = window.fbq;

        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";

        const firstScript = document.getElementsByTagName("script")[0];

        if (firstScript?.parentNode) {
            firstScript.parentNode.insertBefore(script, firstScript);
        } else {
            document.head.appendChild(script);
        }
    }

    window.fbq("init", cleanPixelId);
    initializedPixelId = cleanPixelId;
};

export const trackPageView = () => {
    window.fbq?.("track", "PageView");
};

export const trackLead = (eventData?: MetaPixelEventData) => {
    window.fbq?.("track", "Lead", eventData);
};
