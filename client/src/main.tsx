import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

import FloatingSocials from "./components/FloatingSocials/FloatingSocials";
import "./styles/_base.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <FloatingSocials />
  </React.StrictMode>
);
