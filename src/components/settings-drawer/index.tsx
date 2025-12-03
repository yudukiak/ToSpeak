import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldSet, FieldSeparator } from "@/components/ui/field";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToastLogs } from "@/contexts/use-toast-logs";
import { useSettings } from "@/contexts/use-settings";
import { ReplacementList } from "./replacement-list";
import { BlockedAppList } from "./blocked-app-list";
import { SpeechTemplateField } from "./speech-template-field";
import { VoiceSettingsField } from "./voice-settings-field";
import { VolumeSettingsField } from "./volume-settings-field";
import { MaxTextLengthField } from "./max-text-length-field";
import { DuplicateNotificationField } from "./duplicate-notification-field";
import { SettingsManagementField } from "./settings-management-field";
import { ConsecutiveCharField } from "./consecutive-char-field";

export function SettingsDrawer() {
  const { availableVoices, setVoice, setVolume } = useToastLogs();
  const {
    settings,
    updateSettings,
    addReplacement,
    updateReplacement,
    removeReplacement,
    addBlockedApp,
    updateBlockedApp,
    removeBlockedApp,
    exportSettings,
    importSettings,
    resetSettings,
  } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm">
          <Settings />
        </Button>
      </DrawerTrigger>
      <DrawerContent 
        className="w-[90dvw]! sm:max-w-[90dvw]! h-[calc(100dvh-32px)] top-8!"
      >
        <ScrollArea className="h-full" type="always">
          <DrawerHeader>
            <DrawerTitle>設定</DrawerTitle>
            <DrawerDescription>設定は自動で保存されます。</DrawerDescription>
          </DrawerHeader>
          <div className="pl-4 pr-4 pb-4">
            <FieldSet className="gap-6">
              {/* 読ませるテンプレート */}
              <SpeechTemplateField
                speechTemplate={settings.speechTemplate}
                onUpdate={(speechTemplate) =>
                  updateSettings({ speechTemplate })
                }
              />
              <FieldSeparator />
              {/* 変換リスト */}
              <ReplacementList
                replacements={settings.replacements}
                onAdd={addReplacement}
                onUpdate={updateReplacement}
                onRemove={removeReplacement}
              />
              <FieldSeparator />
              {/* 音声設定 */}
              <VoiceSettingsField
                voiceName={settings.voiceName}
                availableVoices={availableVoices}
                onVoiceChange={(voiceName) => {
                  updateSettings({ voiceName: voiceName || undefined });
                  setVoice(voiceName);
                }}
              />
              <FieldSeparator />
              {/* 音量設定 */}
              <VolumeSettingsField
                volume={settings.volume || 20}
                onVolumeChange={(volume) => {
                  updateSettings({ volume });
                  setVolume(volume);
                }}
              />
              <FieldSeparator />
              {/* 読み上げテキストの最大文字数 */}
              <MaxTextLengthField
                maxTextLength={settings.maxTextLength || 0}
                onUpdate={(maxTextLength) =>
                  updateSettings({ maxTextLength })
                }
              />
              <FieldSeparator />
              {/* 重複通知の無視 */}
              <DuplicateNotificationField
                duplicateNotificationIgnoreSeconds={
                  settings.duplicateNotificationIgnoreSeconds ?? 30
                }
                onUpdate={(duplicateNotificationIgnoreSeconds) =>
                  updateSettings({ duplicateNotificationIgnoreSeconds })
                }
              />
              <FieldSeparator />
              {/* 連続文字の短縮 */}
              <ConsecutiveCharField
                consecutiveCharMinLength={settings.consecutiveCharMinLength || 0}
                onUpdate={(consecutiveCharMinLength: number) =>
                  updateSettings({ consecutiveCharMinLength })
                }
              />
              <FieldSeparator />
              {/* 読ませないアプリ */}
              <BlockedAppList
                blockedApps={settings.blockedApps}
                onAdd={addBlockedApp}
                onUpdate={updateBlockedApp}
                onRemove={removeBlockedApp}
              />
              <FieldSeparator />
              {/* 設定の管理 */}
              <SettingsManagementField
                onExport={exportSettings}
                onImport={importSettings}
                onReset={resetSettings}
              />
            </FieldSet>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

