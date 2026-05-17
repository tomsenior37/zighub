import { type RouteObject, redirect } from "react-router-dom";
import { Layout } from "./Layout";
import { AutomationsPage } from "./pages/AutomationsPage";
import { DevicesPage } from "./pages/DevicesPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WizardPage } from "./pages/WizardPage";
import { isFirstRun } from "./hooks/useFirstRun";

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        loader: () => {
          return isFirstRun() ? redirect("/wizard") : redirect("/devices");
        },
      },
      { path: "/wizard", element: <WizardPage /> },
      { path: "/devices", element: <DevicesPage /> },
      { path: "/automations", element: <AutomationsPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
