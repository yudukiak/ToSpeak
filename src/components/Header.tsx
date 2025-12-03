import { Minus, X } from "lucide-react";
import { WindowButton } from "@/components/ui/window-button";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { useToastLogs } from "@/contexts/ToastLogContext";
import { useSettings } from "@/contexts/SettingsContext";

export function Header() {
  const { availableVoices, setVoice, setVolume } = useToastLogs();
  const { settings, updateSettings, addReplacement, updateReplacement, removeReplacement, addBlockedApp, updateBlockedApp, removeBlockedApp, exportSettings, importSettings, resetSettings } =
    useSettings();

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
        <SettingsDrawer
          settings={settings}
          availableVoices={availableVoices}
          onUpdateSettings={updateSettings}
          onAddReplacement={addReplacement}
          onUpdateReplacement={updateReplacement}
          onRemoveReplacement={removeReplacement}
          onAddBlockedApp={addBlockedApp}
          onUpdateBlockedApp={updateBlockedApp}
          onRemoveBlockedApp={removeBlockedApp}
          onExportSettings={exportSettings}
          onImportSettings={importSettings}
          onResetSettings={resetSettings}
          onSetVoice={setVoice}
          onSetVolume={setVolume}
        />
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
