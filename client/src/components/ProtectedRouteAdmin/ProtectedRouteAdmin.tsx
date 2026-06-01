import { Navigate } from "react-router-dom";

type ProtectedRouteAdminProps = {
    children: React.ReactNode;
};

const ProtectedRouteAdmin = ({ children }: ProtectedRouteAdminProps) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRouteAdmin;