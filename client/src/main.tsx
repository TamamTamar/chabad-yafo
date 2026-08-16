import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "@fontsource/assistant/400.css";
import "@fontsource/assistant/500.css";
import "@fontsource/assistant/700.css";
import "@fontsource/assistant/800.css";

import { router } from "./app/router";
import {
  initMetaPixel,
  trackPageView,
} from "./services/metaPixelService";
import "./styles/_base.scss";

const preloadReloadKey = "chabad-yafo:preload-reload";
const preloadReloadCooldownMs = 15_000;

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();

  let lastReloadAt = 0;
  let canTrackReload = true;

  try {
    lastReloadAt = Number(sessionStorage.getItem(preloadReloadKey)) || 0;
  } catch {
    canTrackReload = false;
  }

  if (!canTrackReload || Date.now() - lastReloadAt < preloadReloadCooldownMs) {
    return;
  }

  try {
    sessionStorage.setItem(preloadReloadKey, String(Date.now()));
  } catch {
    return;
  }

  window.location.reload();
});

const metaPixelId = import.meta.env.VITE_META_PIXEL_ID?.trim();
const isPrivateOnboardingPath = window.location.pathname.startsWith(
  "/daycare/onboarding/"
);

if (
  !isPrivateOnboardingPath &&
  metaPixelId &&
  metaPixelId !== "PUT_PIXEL_ID_HERE"
) {
  initMetaPixel(metaPixelId);
  trackPageView();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
