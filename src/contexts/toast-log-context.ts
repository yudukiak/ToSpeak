import { createContext } from "react";
import type { ToastLogContextType } from "./ToastLogContext";

export const ToastLogContext = createContext<ToastLogContextType | undefined>(
  undefined
);

