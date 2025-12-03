import { Minus, X } from "lucide-react";
import { WindowButton } from "@/components/ui/window-button";

export function Header() {

  const handleMinimize = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined" && window.ipcRenderer) {
      window.ipcRenderer.send("window-minimize");
    }
  };

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined" && window.ipcRenderer) {
      window.ipcRenderer.send("window-close");
    }
  };

  return (
    <header className="h-8 flex justify-between bg-neutral-900 relative z-100 select-none [-webkit-app-region:drag] pointer-events-auto">
      <div className="flex justify-center items-center text-xs ml-2" data-app-name>
        ToSpeak
      </div>
      <div className="flex [-webkit-app-region:no-drag]">
        <WindowButton variant="minimize" onClick={handleMinimize}>
          <Minus/>
        </WindowButton>
        <WindowButton variant="close" onClick={handleClose}>
          <X/>
        </WindowButton>
      </div>
    </header>
  );
}
