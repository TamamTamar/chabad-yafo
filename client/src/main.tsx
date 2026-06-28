import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "@fontsource/assistant/400.css";
import "@fontsource/assistant/500.css";
import "@fontsource/assistant/700.css";
import "@fontsource/assistant/800.css";

import { router } from "./app/router";
import FloatingSocials from "./components/FloatingSocials/FloatingSocials";
import {
  initMetaPixel,
  trackPageView,
} from "./services/metaPixelService";
import "./styles/_base.scss";

const metaPixelId = import.meta.env.VITE_META_PIXEL_ID?.trim();

if (metaPixelId && metaPixelId !== "PUT_PIXEL_ID_HERE") {
  initMetaPixel(metaPixelId);
  trackPageView();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <FloatingSocials />
  </React.StrictMode>
);
