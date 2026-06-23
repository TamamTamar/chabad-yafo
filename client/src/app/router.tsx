import { createBrowserRouter } from "react-router-dom";
import ProtectedRouteAdmin from "../components/ProtectedRouteAdmin/ProtectedRouteAdmin";
import AboutPage from "../pages/AboutPage/AboutPage";
import AdminDashboard from "../pages/AdminDashboard/AdminDashboard";
import AdminLogin from "../pages/AdminLogin/AdminLogin";
import DaycareRegistration from "../pages/DaycareRegistration/DaycareRegistration";
import DonatePage from "../pages/DonatePage/DonatePage";
import ErrorPage from "../pages/ErrorPage/ErrorPage";
import Families from "../pages/Families/Families";
import GalleryCategoryPage from "../pages/Gallery/GalleryCategoryPage";
import GalleryPage from "../pages/Gallery/GalleryPage";
import Home from "../pages/Home/Home";
import MachatzitHashekel from "../pages/MachatzitHashekel/MachatzitHashekel";
import PurimMatanotLaEvyonim from "../pages/PurimMatanotLaEvyonim/PurimMatanotLaEvyonim";
import WriteToRebbe from "../pages/WriteToRebbe/WriteToRebbe";
import Root from "./Root";


export const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            { index: true, element: <Home /> },
            { path: "purim", element: <PurimMatanotLaEvyonim /> },
            { path: "machatzit-hashekel", element: <MachatzitHashekel /> },
            { path: "*", element: <ErrorPage /> },
            {
                path: "families", element: <Families />
            },
            {
                path: "daycare-registration", element: <DaycareRegistration />
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
