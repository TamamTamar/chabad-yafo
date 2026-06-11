import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "@fontsource/assistant/400.css";
import "@fontsource/assistant/500.css";
import "@fontsource/assistant/700.css";
import "@fontsource/assistant/800.css";

import { router } from "./app/router";
import FloatingSocials from "./components/FloatingSocials/FloatingSocials";
import "./styles/_base.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <FloatingSocials />
  </React.StrictMode>
);