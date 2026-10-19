import dotenv from 'dotenv';
// NODE_ENV alone can never promote a development invocation to production.
export const productionInvocation = process.argv.includes('--production');
export const loadRuntimeEnvironment = () => {
    if (productionInvocation && process.env.NODE_ENV === 'production') dotenv.config({ quiet: true });
};
