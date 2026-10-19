import { AsyncLocalStorage } from 'node:async_hooks';
const authorization=new AsyncLocalStorage<boolean>();
export const requireMaintenanceAuthorization = () => {
    if (!authorization.getStore()) throw new Error('EXPLICIT_MAINTENANCE_REQUIRED');
};
export const withMaintenanceAuthorization = <T>(action:()=>Promise<T>) => authorization.run(true,action);
