import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
        <Button size="sm" aria-label="設定を表示">
          <Settings aria-hidden="true" />
          <span className="sr-only">設定を表示</span>
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
            <Accordion type="multiple" className="w-full">
              {/* 音声設定 */}
              <AccordionItem value="voice">
                <AccordionTrigger>音声設定</AccordionTrigger>
                <AccordionContent>
                  <VoiceSettingsField
                    voiceName={settings.voiceName}
                    availableVoices={availableVoices}
                    onVoiceChange={(voiceName) => {
                      updateSettings({ voiceName: voiceName || undefined });
                      setVoice(voiceName);
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 音量設定 */}
              <AccordionItem value="volume">
                <AccordionTrigger>音量設定</AccordionTrigger>
                <AccordionContent>
                  <VolumeSettingsField
                    volume={settings.volume || 20}
                    onVolumeChange={(volume) => {
                      updateSettings({ volume });
                      setVolume(volume);
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 読ませるテンプレート */}
              <AccordionItem value="speech-template">
                <AccordionTrigger>読ませるテンプレート</AccordionTrigger>
                <AccordionContent>
                  <SpeechTemplateField
                    speechTemplate={settings.speechTemplate}
                    onUpdate={(speechTemplate) =>
                      updateSettings({ speechTemplate })
                    }
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 読み上げテキストの最大文字数 */}
              <AccordionItem value="max-text-length">
                <AccordionTrigger>読み上げテキストの最大文字数</AccordionTrigger>
                <AccordionContent>
                  <MaxTextLengthField
                    maxTextLength={settings.maxTextLength || 0}
                    onUpdate={(maxTextLength) =>
                      updateSettings({ maxTextLength })
                    }
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 重複通知の無視 */}
              <AccordionItem value="duplicate-notification">
                <AccordionTrigger>重複通知の無視</AccordionTrigger>
                <AccordionContent>
                  <DuplicateNotificationField
                    duplicateNotificationIgnoreSeconds={
                      settings.duplicateNotificationIgnoreSeconds ?? 30
                    }
                    onUpdate={(duplicateNotificationIgnoreSeconds) =>
                      updateSettings({ duplicateNotificationIgnoreSeconds })
                    }
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 連続文字の短縮 */}
              <AccordionItem value="consecutive-char">
                <AccordionTrigger>連続文字の短縮</AccordionTrigger>
                <AccordionContent>
                  <ConsecutiveCharField
                    consecutiveCharMinLength={settings.consecutiveCharMinLength || 0}
                    onUpdate={(consecutiveCharMinLength: number) =>
                      updateSettings({ consecutiveCharMinLength })
                    }
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 変換リスト */}
              <AccordionItem value="replacement-list">
                <AccordionTrigger>変換リスト</AccordionTrigger>
                <AccordionContent>
                  <ReplacementList
                    replacements={settings.replacements}
                    onAdd={addReplacement}
                    onUpdate={updateReplacement}
                    onRemove={removeReplacement}
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 読ませないアプリ */}
              <AccordionItem value="blocked-app">
                <AccordionTrigger>読ませないアプリ</AccordionTrigger>
                <AccordionContent>
                  <BlockedAppList
                    blockedApps={settings.blockedApps}
                    onAdd={addBlockedApp}
                    onUpdate={updateBlockedApp}
                    onRemove={removeBlockedApp}
                  />
                </AccordionContent>
              </AccordionItem>
              {/* 設定の管理 */}
              <AccordionItem value="settings-management">
                <AccordionTrigger>設定の管理</AccordionTrigger>
                <AccordionContent>
                  <SettingsManagementField
                    onExport={exportSettings}
                    onImport={importSettings}
                    onReset={resetSettings}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

