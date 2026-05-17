import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { createQueryClient } from "./queryClient";
import { routes } from "./routes";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("root element not found");
}

const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
