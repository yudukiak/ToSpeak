import { useContext } from "react";
import { ToastLogContext } from "./toast-log-context";

export function useToastLogs() {
  const context = useContext(ToastLogContext);
  if (context === undefined) {
    throw new Error("useToastLogs must be used within a ToastLogProvider");
  }
  return context;
}

