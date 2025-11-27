import { useState, useEffect, useRef } from "react";
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  Settings,
  History,
  Trash2,
  Plus,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldSet,
  FieldLegend,
  FieldGroup,
} from "@/components/ui/field";
import { useSettings } from "./contexts/SettingsContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToastLogs, PastNotification } from "./contexts/ToastLogContext";
import "./App.css";

function App() {
  const { logs, setVolume, availableVoices, setVoice } = useToastLogs();
  const {
    settings,
    updateSettings,
    addReplacement,
    removeReplacement,
    addBlockedApp,
    removeBlockedApp,
    exportSettings,
    importSettings,
    resetSettings,
  } = useSettings();

  // 変換リストの追加用の状態
  const [newReplacementFrom, setNewReplacementFrom] = useState("");
  const [newReplacementTo, setNewReplacementTo] = useState("");

  // 除外アプリの追加用の状態
  const [newBlockedApp, setNewBlockedApp] = useState("");
  const [newBlockedAppId, setNewBlockedAppId] = useState("");
  const [newBlockedAppIsRegex, setNewBlockedAppIsRegex] = useState(false);
  const [newBlockedAppIdIsRegex, setNewBlockedAppIdIsRegex] = useState(false);
  const [newBlockedTitle, setNewBlockedTitle] = useState("");
  const [newBlockedTitleIsRegex, setNewBlockedTitleIsRegex] = useState(false);
  const [newBlockedText, setNewBlockedText] = useState("");
  const [newBlockedTextIsRegex, setNewBlockedTextIsRegex] = useState(false);

  // 設定のインポート用のファイル入力参照
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 起動時に保存された音声設定を適用（初回のみ）
  const voiceAppliedRef = useRef(false);
  useEffect(() => {
    // 既に適用済みの場合はスキップ
    if (voiceAppliedRef.current) {
      return;
    }
    
    // 音声リストが読み込まれ、音声設定がある場合のみ適用
    if (settings.voiceName && availableVoices.length > 0) {
      // 利用可能な音声リストが読み込まれたら、保存された音声設定を適用
      setVoice(settings.voiceName);
      voiceAppliedRef.current = true;
    }
  }, [settings.voiceName, availableVoices.length, setVoice]);

  // ログタイプに応じたスタイル、アイコン、タイトルを取得
  const getLogConfig = (log: { type: string; app?: string }) => {
    switch (log.type) {
      case "notification":
        return {
          icon: Bell,
          title: log.app || "通知",
        };
      case "error":
        return {
          icon: AlertCircle,
          title: "エラー",
        };
      case "ready":
        return {
          icon: CheckCircle2,
          title: "準備完了",
        };
      case "info":
        return {
          icon: Info,
          title: "情報",
        };
      case "past_notifications":
        return {
          icon: History,
          title: "過去の通知",
        };
      default:
        return {
          icon: HelpCircle,
          title: "その他",
        };
    }
  };

  // タイムスタンプをフォーマット
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  // 起動時に保存された音量設定を適用
  useEffect(() => {
    if (settings.volume !== undefined) {
      setVolume(settings.volume);
    }
  }, [settings.volume, setVolume]);

  return (
    <ScrollArea className="h-dvh w-dvw" type="always">
      <main className="h-dvh w-dvw p-4">
        <Drawer>
          <DrawerTrigger className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90vh] flex flex-col">
            <DrawerHeader>
              <DrawerTitle>設定</DrawerTitle>
              <DrawerDescription>設定は自動で保存されます。</DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="h-[calc(90vh-10rem)]" type="always">
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
                              updateSettings({ speechTemplate: e.target.value })
                            }
                            placeholder="{app}、{title}、{text}"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              updateSettings({
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
                  <FieldGroup>
                    <FieldLegend>変換リスト</FieldLegend>
                    <Field>
                      <FieldLabel>新しい変換を追加</FieldLabel>
                      <FieldContent>
                        <div className="flex gap-2">
                          <Input
                            value={newReplacementFrom}
                            onChange={(e) =>
                              setNewReplacementFrom(e.target.value)
                            }
                            placeholder="変換前（例: Chrome）"
                            className="flex-1"
                          />
                          <Input
                            value={newReplacementTo}
                            onChange={(e) =>
                              setNewReplacementTo(e.target.value)
                            }
                            placeholder="変換後（例: クローム）"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (newReplacementFrom && newReplacementTo) {
                                addReplacement({
                                  from: newReplacementFrom,
                                  to: newReplacementTo,
                                });
                                setNewReplacementFrom("");
                                setNewReplacementTo("");
                              }
                            }}
                            size="icon"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </FieldContent>
                    </Field>
                    {settings.replacements.length > 0 && (
                      <div className="space-y-2">
                        {settings.replacements.map((replacement, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 rounded-md border p-2"
                          >
                            <span className="flex-1 text-sm">
                              {replacement.from} → {replacement.to}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReplacement(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldGroup>

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
                            updateSettings({ voiceName });
                            // Python側に音声変更を送信
                            // 空文字列の場合は読み上げ無効、音声名が指定された場合はその音声を使用
                            setVoice(value || "");
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
                              <SelectItem value="" disabled>
                                利用可能な音声がありません
                              </SelectItem>
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
                            updateSettings({ volume: newVolume });
                            setVolume(newVolume);
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
                            updateSettings({
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
                            onClick={exportSettings}
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
                                importSettings(file)
                                  .then(() => {
                                    alert("設定をインポートしました");
                                  })
                                  .catch((error) => {
                                    alert(`設定のインポートに失敗しました: ${error.message}`);
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
                            if (confirm("すべての設定をリセットしますか？この操作は取り消せません。")) {
                              resetSettings();
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
                            updateSettings({
                              consecutiveCharMinLength: isNaN(value) || value < 0 ? 0 : value,
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
                  <FieldGroup>
                    <FieldLegend>読ませないアプリ</FieldLegend>
                    <Field>
                      <FieldLabel>新しい除外アプリを追加</FieldLabel>
                      <FieldContent>
                        <div className="space-y-2">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={newBlockedApp}
                                onChange={(e) =>
                                  setNewBlockedApp(e.target.value)
                                }
                                placeholder="アプリ名（例: Google Chrome）"
                                className="flex-1"
                              />
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newBlockedAppIsRegex}
                                  onCheckedChange={setNewBlockedAppIsRegex}
                                  id="app-regex"
                                />
                                <label
                                  htmlFor="app-regex"
                                  className="text-sm text-muted-foreground whitespace-nowrap"
                                >
                                  正規表現
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={newBlockedAppId}
                                onChange={(e) =>
                                  setNewBlockedAppId(e.target.value)
                                }
                                placeholder="アプリID（例: Chrome.YMHJ3T54TUN5QFISD4A7LWJ7MI）"
                                className="flex-1"
                              />
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newBlockedAppIdIsRegex}
                                  onCheckedChange={setNewBlockedAppIdIsRegex}
                                  id="app-id-regex"
                                />
                                <label
                                  htmlFor="app-id-regex"
                                  className="text-sm text-muted-foreground whitespace-nowrap"
                                >
                                  正規表現
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={newBlockedTitle}
                                onChange={(e) =>
                                  setNewBlockedTitle(e.target.value)
                                }
                                placeholder="タイトル（app または app_id と組み合わせ）"
                                className="flex-1"
                              />
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newBlockedTitleIsRegex}
                                  onCheckedChange={setNewBlockedTitleIsRegex}
                                  id="title-regex"
                                />
                                <label
                                  htmlFor="title-regex"
                                  className="text-sm text-muted-foreground whitespace-nowrap"
                                >
                                  正規表現
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={newBlockedText}
                                onChange={(e) =>
                                  setNewBlockedText(e.target.value)
                                }
                                placeholder="本文（app または app_id と組み合わせ）"
                                className="flex-1"
                              />
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newBlockedTextIsRegex}
                                  onCheckedChange={setNewBlockedTextIsRegex}
                                  id="text-regex"
                                />
                                <label
                                  htmlFor="text-regex"
                                  className="text-sm text-muted-foreground whitespace-nowrap"
                                >
                                  正規表現
                                </label>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              if (newBlockedApp || newBlockedAppId) {
                                addBlockedApp({
                                  app: newBlockedApp || undefined,
                                  app_id: newBlockedAppId || undefined,
                                  appIsRegex: newBlockedAppIsRegex,
                                  appIdIsRegex: newBlockedAppIdIsRegex,
                                  title: newBlockedTitle || undefined,
                                  titleIsRegex: newBlockedTitleIsRegex,
                                  text: newBlockedText || undefined,
                                  textIsRegex: newBlockedTextIsRegex,
                                });
                                setNewBlockedApp("");
                                setNewBlockedAppId("");
                                setNewBlockedAppIsRegex(false);
                                setNewBlockedAppIdIsRegex(false);
                                setNewBlockedTitle("");
                                setNewBlockedTitleIsRegex(false);
                                setNewBlockedText("");
                                setNewBlockedTextIsRegex(false);
                              }
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            追加
                          </Button>
                        </div>
                        <FieldDescription>
                          アプリ名またはアプリIDのいずれかを指定してください。タイトルや本文を指定すると、app/app_id × (title OR text) の組み合わせで除外されます。正規表現を使用する場合は、スイッチをONにしてください。
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                    {settings.blockedApps.length > 0 && (
                      <div className="space-y-2">
                        {settings.blockedApps.map((blockedApp, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 rounded-md border p-2"
                          >
                            <div className="flex-1 text-sm space-y-1">
                              {blockedApp.app && (
                                <div>
                                  アプリ: {blockedApp.app}
                                  {blockedApp.appIsRegex && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (正規表現)
                                    </span>
                                  )}
                                </div>
                              )}
                              {blockedApp.app_id && (
                                <div>
                                  ID: {blockedApp.app_id}
                                  {blockedApp.appIdIsRegex && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (正規表現)
                                    </span>
                                  )}
                                </div>
                              )}
                              {blockedApp.title && (
                                <div>
                                  タイトル: {blockedApp.title}
                                  {blockedApp.titleIsRegex && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (正規表現)
                                    </span>
                                  )}
                                </div>
                              )}
                              {blockedApp.text && (
                                <div>
                                  本文: {blockedApp.text}
                                  {blockedApp.textIsRegex && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (正規表現)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBlockedApp(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldGroup>
                </FieldSet>
              </div>
            </ScrollArea>
          </DrawerContent>
        </Drawer>

        {/* ログ表示エリア */}
        <div className="w-full">
          <div className="">
            <h2 className="text-xl font-bold">通知ログ ({logs.length}件)</h2>
          </div>

          <ScrollArea className="border rounded-lg h-96" type="always">
            <div className="flex flex-col-reverse">
              {logs.map((log, index) => {
                const { icon: Icon, title: logTitle } = getLogConfig(log);
                const {
                  app,
                  app_id,
                  notification_id,
                  text,
                  timestamp,
                  title,
                  type,
                  message,
                  notifications,
                } = log;

                // 過去の通知の場合、Dialogで表示
                if (type === "past_notifications" && notifications) {
                  return (
                    <Card
                      key={`past-notifications-${timestamp}`}
                      className="m-2 mr-4"
                    >
                      <CardHeader className="gap-0">
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-semibold">{title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-700 dark:text-gray-300">
                        {message}
                      </CardContent>
                      <CardFooter>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline">詳細を表示</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-full! h-full">
                            <DialogHeader className="text-left">
                              <DialogTitle>
                                過去の通知（{notifications.length}件）
                              </DialogTitle>
                              <DialogDescription>
                                起動時に既に存在していた通知の一覧です
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea
                              className="min-w-[80dvw] h-[calc(100dvh-8rem)] pr-3"
                              type="always"
                            >
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[150px]">
                                      app
                                    </TableHead>
                                    <TableHead className="min-w-[150px]">
                                      app_id
                                    </TableHead>
                                    <TableHead className="min-w-[200px]">
                                      title
                                    </TableHead>
                                    <TableHead className="min-w-[300px]">
                                      text
                                    </TableHead>
                                    <TableHead className="min-w-[150px]">
                                      timestamp
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {notifications.map(
                                    (notif: PastNotification) => (
                                      <TableRow key={notif.notification_id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                          {notif.app}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                          {notif.app_id}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                          {notif.title}
                                        </TableCell>
                                        <TableCell className="whitespace-pre-wrap">
                                          {notif.text}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                          {formatTimestamp(notif.timestamp)}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                              <ScrollBar
                                className=""
                                orientation="horizontal"
                              />
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </CardFooter>
                    </Card>
                  );
                }

                // 通常の通知
                return (
                  <Card
                    key={`${notification_id || index}-${timestamp}`}
                    className="m-2 mr-4"
                  >
                    <CardHeader className="gap-0">
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold">{title}</span>
                        <Popover>
                          <PopoverTrigger className="ml-auto cursor-pointer">
                            <FileText className="h-5 w-5 ml-auto cursor-pointer" />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto" align="end">
                            <div className="grid gap-4">
                              {[
                                { label: "app", value: app },
                                { label: "app_id", value: app_id },
                                { label: "title", value: title },
                                { label: "text", value: text },
                              ].map((item, index) => (
                                <div key={index} className="space-y-2">
                                  <h3 className="text-sm font-bold">
                                    {item.label}
                                  </h3>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                                    {item.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {(text || message) && <>{text || message}</>}
                    </CardContent>
                    <CardFooter className="text-sm text-gray-400 dark:text-gray-600 justify-end gap-2">
                      {type === "notification" && logTitle && (
                        <>
                          <span>{logTitle}</span>
                          <span>-</span>
                        </>
                      )}
                      <span>{timestamp ? formatTimestamp(timestamp) : ""}</span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </main>
    </ScrollArea>
  );
}

export default App;
