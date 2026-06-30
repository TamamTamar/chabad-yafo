type GoogleAnalyticsEventData = Record<string, string | number | boolean | undefined>;

type GtagFunction = (...args: unknown[]) => void;

declare global {
    interface Window {
        gtag?: GtagFunction;
    }
}

const trackEvent = (eventName: string, eventData?: GoogleAnalyticsEventData) => {
    if (typeof window === "undefined" || !window.gtag) {
        return;
    }

    window.gtag("event", eventName, eventData);
};

export const trackDonationStart = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("donation_start", eventData);
};

export const trackDonationPaymentStart = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("donation_payment_start", eventData);
};

export const trackDonationComplete = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("donation_complete", eventData);
};

export const trackFamilyFormSubmit = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("family_form_submit", eventData);
};

export const trackDaycarePageView = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("daycare_page_view", eventData);
};

export const trackDaycareCtaClick = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("daycare_cta_click", eventData);
};

export const trackDaycareFormStart = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("daycare_form_start", eventData);
};

export const trackDaycareFormSubmit = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("daycare_form_submit", eventData);
};

export const trackDaycareRegistrationSubmit = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("daycare_registration_submit", eventData);
};

export const trackRebbeLetterSubmit = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("rebbe_letter_submit", eventData);
};

export const trackWhatsAppClick = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("whatsapp_click", eventData);
};

export const trackPhoneClick = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("phone_click", eventData);
};

export const trackCallClick = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("call_click", eventData);
};

export const trackDaycareWhatsAppClick = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("daycare_whatsapp_click", eventData);
};

export const trackDaycareCallClick = (eventData?: GoogleAnalyticsEventData) => {
    trackEvent("daycare_call_click", eventData);
};
