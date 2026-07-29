import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRouteAdmin from "../components/ProtectedRouteAdmin/ProtectedRouteAdmin";
import Root from "./Root";

const AboutPage = lazy(() => import("../pages/AboutPage/AboutPage"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard/AdminDashboard"));
const AdminLogin = lazy(() => import("../pages/AdminLogin/AdminLogin"));
const DaycareAdmin = lazy(() => import("../pages/Admin/DaycareAdmin/DaycareAdmin"));
const DaycareOnboardingAdmin = lazy(
    () => import("../pages/Admin/DaycareOnboarding/DaycareOnboardingAdmin")
);
const DaycareOnboarding = lazy(
    () => import("../pages/DaycareOnboarding/DaycareOnboarding")
);
const DaycareParentInfo = lazy(() => import("../pages/DaycareParentInfo/DaycareParentInfo"));
const DaycareRegistration = lazy(() => import("../pages/DaycareRegistration/DaycareRegistration"));
const DaycareDonations = lazy(() => import("../pages/DaycareDonations/DaycareDonations"));
const DonatePage = lazy(() => import("../pages/DonatePage/DonatePage"));
const ErrorPage = lazy(() => import("../pages/ErrorPage/ErrorPage"));
const Families = lazy(() => import("../pages/Families/Families"));
const GalleryCategoryPage = lazy(() => import("../pages/Gallery/GalleryCategoryPage"));
const GalleryPage = lazy(() => import("../pages/Gallery/GalleryPage"));
const Home = lazy(() => import("../pages/Home/Home"));
const MachatzitHashekel = lazy(() => import("../pages/MachatzitHashekel/MachatzitHashekel"));
const Kaparot = lazy(() => import("../pages/Kaparot/Kaparot"));
const PurimMatanotLaEvyonim = lazy(
    () => import("../pages/PurimMatanotLaEvyonim/PurimMatanotLaEvyonim")
);
const Taanit = lazy(() => import("../pages/Taanit/Taanit"));
const WriteToRebbe = lazy(() => import("../pages/WriteToRebbe/WriteToRebbe"));


export const router = createBrowserRouter([
    {
        path: "/daycare/onboarding/:token",
        element: (
            <Suspense fallback={<div aria-live="polite">טוען את מסלול ההצטרפות...</div>}>
                <DaycareOnboarding />
            </Suspense>
        ),
    },
    {
        path: "/",
        element: <Root />,
        children: [
            { index: true, element: <Home /> },
            { path: "purim", element: <PurimMatanotLaEvyonim /> },
            { path: "machatzit-hashekel", element: <MachatzitHashekel /> },
            { path: "kaparot", element: <Kaparot /> },
            { path: "taanit", element: <Taanit /> },
            { path: "*", element: <ErrorPage /> },
            {
                path: "families", element: <Families />
            },
            {
                path: "daycare-registration", element: <DaycareRegistration />
            },
            {
                path: "daycare-donations", element: <DaycareDonations />
            },
            {
                path: "daycare-parent-info", element: <DaycareParentInfo />
            },
            {
                path: "daycare-enrollment",
                element: <Navigate to="/daycare-registration#daycare-form" replace />
            },
            {
                path: "admin/dashboard",
                element: (
                    <ProtectedRouteAdmin>
                        <AdminDashboard />
                    </ProtectedRouteAdmin>
                ),
            },
            {
                path: "admin/daycare",
                element: (
                    <ProtectedRouteAdmin>
                        <DaycareAdmin />
                    </ProtectedRouteAdmin>
                ),
            },
            {
                path: "admin/daycare-onboarding/:id",
                element: (
                    <ProtectedRouteAdmin>
                        <DaycareOnboardingAdmin />
                    </ProtectedRouteAdmin>
                ),
            },
            {
                path: "admin/login", element: < AdminLogin />
            },
            {
                path: "gallery",
                element: <GalleryPage />,
            },
            {
                path: "gallery/:categoryId",
                element: <GalleryCategoryPage />,
            },
            {
                path: "donate",
                element: <DonatePage/>,
            },
            {
                path: "about",
                element: <AboutPage/>,
            },
            {
                path: "write-to-rebbe",
                element: <WriteToRebbe />,
            },
           

     
        ],
    },
]);
