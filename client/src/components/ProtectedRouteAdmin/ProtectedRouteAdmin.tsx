import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAdminSession } from "../../services/adminAuthService";

type ProtectedRouteAdminProps = {
    children: React.ReactNode;
};

const ProtectedRouteAdmin = ({ children }: ProtectedRouteAdminProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        getAdminSession()
            .then(() => {
                if (isMounted) {
                    setIsAdmin(true);
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

    return <>{children}</>;
};

export default ProtectedRouteAdmin;
