const isDev = process.env.NODE_ENV !== "production";

export const logger = {
    log: (...args: unknown[]) => {
        if (isDev) {
            console.info(...args);
        }
    },

    warn: (...args: unknown[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },

    error: (...args: unknown[]) => {
        console.error(...args);
    },
};
