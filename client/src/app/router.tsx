import { createBrowserRouter } from "react-router-dom";
import Root from "./Root";
import Home from "../pages/Home/Home";
import Shabbat from "../pages/Shabbat/Shabbat";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            { index: true, element: <Home /> },
            { path: "shabbat", element: <Shabbat /> },
        ],
    },
]);
