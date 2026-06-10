import { createBrowserRouter } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage/ErrorPage";
import Home from "../pages/Home/Home";
import MachatzitHashekel from "../pages/MachatzitHashekel/MachatzitHashekel";
import PurimMatanotLaEvyonim from "../pages/PurimMatanotLaEvyonim/PurimMatanotLaEvyonim";
import Root from "./Root";
import Families from "../pages/Families/Families";
import AdminFamilies from "../pages/AdminFamilies/AdminFamilies";
import AdminLogin from "../pages/AdminLogin/AdminLogin";
import ProtectedRouteAdmin from "../components/ProtectedRouteAdmin/ProtectedRouteAdmin";
import GalleryPage from "../pages/Gallery/GalleryPage";
import GalleryCategoryPage from "../pages/Gallery/GalleryCategoryPage";
import DonatePage from "../pages/DonatePage/DonatePage";


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
                path: "admin/families",
                element: (
                    <ProtectedRouteAdmin>
                        <AdminFamilies />
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
           

     
        ],
    },
]);
