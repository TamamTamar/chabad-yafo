import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminShell from "../AdminShell/AdminShell";
import { getAdminSession } from "../../services/adminAuthService";

type ProtectedRouteAdminProps = {
    children: React.ReactNode;
};

const ProtectedRouteAdmin = ({ children }: ProtectedRouteAdminProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLabel, setAdminLabel] = useState<string>();

    useEffect(() => {
        let isMounted = true;

        getAdminSession()
            .then((session) => {
                if (isMounted) {
                    setIsAdmin(true);
                    setAdminLabel(typeof session?.user?.label === "string" ? session.user.label : undefined);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setIsAdmin(false);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    if (isLoading) {
        return null;
    }

    if (!isAdmin) {
        return <Navigate to="/admin/login" replace />;
    }

    return <AdminShell adminLabel={adminLabel}>{children}</AdminShell>;
};

export default ProtectedRouteAdmin;
