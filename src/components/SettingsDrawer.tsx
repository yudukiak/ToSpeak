import { useRef } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WindowButton } from "@/components/ui/window-button";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldSet,
  FieldLegend,
  FieldGroup,
} from "@/components/ui/field";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReplacementList } from "./ReplacementList";
import { BlockedAppList } from "./BlockedAppList";
import type { Settings as SettingsType, Replacement, BlockedApp } from "@/contexts/SettingsContext";

interface SettingsDrawerProps {
  settings: SettingsType;
  availableVoices: string[];
  onUpdateSettings: (settings: Partial<SettingsType>) => void;
  onAddReplacement: (replacement: Replacement) => void;
  onUpdateReplacement: (index: number, replacement: Replacement) => void;
  onRemoveReplacement: (index: number) => void;
  onAddBlockedApp: (blockedApp: BlockedApp) => void;
  onUpdateBlockedApp: (index: number, blockedApp: BlockedApp) => void;
  onRemoveBlockedApp: (index: number) => void;
  onExportSettings: () => void;
  onImportSettings: (file: File) => Promise<void>;
  onResetSettings: () => void;
  onSetVoice: (voiceName: string) => void;
  onSetVolume: (volume: number) => void;
}

export function SettingsDrawer({
  settings,
  availableVoices,
  onUpdateSettings,
  onAddReplacement,
  onUpdateReplacement,
  onRemoveReplacement,
  onAddBlockedApp,
  onUpdateBlockedApp,
  onRemoveBlockedApp,
  onExportSettings,
  onImportSettings,
  onResetSettings,
  onSetVoice,
  onSetVolume,
}: SettingsDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <WindowButton>
          <Settings size={16} />
        </WindowButton>
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
              {/* 読ませるテンプレートの設定 */}
              <FieldGroup>
                <FieldLegend>読ませるテンプレート</FieldLegend>
                <Field>
                  <FieldLabel>テンプレート</FieldLabel>
                  <FieldContent>
                    <div className="flex gap-2">
                      <Input
                        value={settings.speechTemplate}
                        onChange={(e) =>
                          onUpdateSettings({ speechTemplate: e.target.value })
                        }
                        placeholder="{app}、{title}、{text}"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          onUpdateSettings({
                            speechTemplate: "{app}、{title}、{text}",
                          })
                        }
                      >
                        リセット
                      </Button>
                    </div>
                    <FieldDescription>
                      使用可能なプレースホルダー: {"{app}"}, {"{title}"},{" "}
                      {"{text}"}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>

              {/* 変換リスト */}
              <ReplacementList
                replacements={settings.replacements}
                onAdd={onAddReplacement}
                onUpdate={onUpdateReplacement}
                onRemove={onRemoveReplacement}
              />

              {/* 音声設定 */}
              <FieldGroup>
                <FieldLegend>音声設定</FieldLegend>
                <Field>
                  <FieldLabel>音声</FieldLabel>
                  <FieldContent>
                    <Select
                      value={settings.voiceName || ""}
                      onValueChange={(value) => {
                        const voiceName = value || undefined;
                        onUpdateSettings({ voiceName });
                        onSetVoice(value || "");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="音声を選択してください（読み上げ無効）" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.length > 0 ? (
                          availableVoices.map((voice) => (
                            <SelectItem key={voice} value={voice}>
                              {voice}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            利用可能な音声がありません
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {settings.voiceName
                        ? `読み上げ音声: ${settings.voiceName}（読み上げ有効）`
                        : "読み上げに使用する音声を選択してください。音声を選択すると読み上げが開始されます。"}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>

              {/* 音量設定 */}
              <FieldGroup>
                <FieldLegend>音量設定</FieldLegend>
                <Field>
                  <FieldLabel>音量: {settings.volume || 20}</FieldLabel>
                  <FieldContent>
                    <Slider
                      value={[settings.volume || 20]}
                      onValueChange={(values) => {
                        const newVolume = values[0];
                        onUpdateSettings({ volume: newVolume });
                        onSetVolume(newVolume);
                      }}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              {/* 最大文字数設定 */}
              <FieldGroup>
                <FieldLegend>読み上げテキストの最大文字数</FieldLegend>
                <Field>
                  <FieldLabel>最大文字数</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      value={settings.maxTextLength || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        onUpdateSettings({
                          maxTextLength: isNaN(value) || value < 0 ? 0 : value,
                        });
                      }}
                      placeholder="0（無制限）"
                      className="w-full"
                      min={0}
                    />
                    <FieldDescription>
                      読み上げテキストがこの文字数を超える場合、「以下省略」に置き換えられます。0を指定すると無制限です。
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>

              {/* 重複通知の無視時間設定 */}
              <FieldGroup>
                <FieldLegend>重複通知の無視</FieldLegend>
                <Field>
                  <FieldLabel>
                    無視時間（秒）:{" "}
                    {settings.duplicateNotificationIgnoreSeconds ?? 30}
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      value={settings.duplicateNotificationIgnoreSeconds ?? 30}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        onUpdateSettings({
                          duplicateNotificationIgnoreSeconds:
                            isNaN(value) || value < 0 ? 0 : value,
                        });
                      }}
                      placeholder="30"
                      className="w-full"
                      min={0}
                    />
                    <FieldDescription>
                      同じ内容の通知が指定秒数以内に送信された場合、読み上げをスキップします。0を指定すると無効（すべて読み上げ）です。
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>

              {/* 設定のインポート/エクスポート/リセット */}
              <FieldGroup>
                <FieldLegend>設定の管理</FieldLegend>
                <Field>
                  <FieldLabel>設定のインポート/エクスポート</FieldLabel>
                  <FieldContent>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onExportSettings}
                      >
                        エクスポート
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        インポート
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onImportSettings(file)
                              .then(() => {
                                alert("設定をインポートしました");
                              })
                              .catch((error) => {
                                alert(
                                  `設定のインポートに失敗しました: ${error.message}`
                                );
                              });
                            // 同じファイルを再度選択できるようにリセット
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                    <FieldDescription>
                      設定をJSONファイルとしてエクスポート、またはインポートできます。
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>全リセット</FieldLabel>
                  <FieldContent>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (
                          confirm(
                            "すべての設定をリセットしますか？この操作は取り消せません。"
                          )
                        ) {
                          onResetSettings();
                          alert("設定をリセットしました");
                        }
                      }}
                    >
                      全リセット
                    </Button>
                    <FieldDescription>
                      すべての設定をデフォルト値に戻します。この操作は取り消せません。
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>

              {/* 連続文字短縮設定 */}
              <FieldGroup>
                <FieldLegend>連続文字の短縮</FieldLegend>
                <Field>
                  <FieldLabel>連続文字の短縮設定</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      value={settings.consecutiveCharMinLength || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        onUpdateSettings({
                          consecutiveCharMinLength:
                            isNaN(value) || value < 0 ? 0 : value,
                        });
                      }}
                      placeholder="0（無効）"
                      className="w-full"
                      min={0}
                    />
                    <FieldDescription>
                      同じ文字がn文字以上連続している場合、3文字に短縮されます。例: "=========" (9文字) → n=3 の場合 "===" (3文字) になります。0を指定すると無効です。
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>

              {/* 読ませないアプリの設定 */}
              <BlockedAppList
                blockedApps={settings.blockedApps}
                onAdd={onAddBlockedApp}
                onUpdate={onUpdateBlockedApp}
                onRemove={onRemoveBlockedApp}
              />
            </FieldSet>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

