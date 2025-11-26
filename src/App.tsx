import { useState } from "react";
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  Menu,
  Settings,
  History,
  Trash2,
  Plus,
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
import { useToastLogs, PastNotification } from "./contexts/ToastLogContext";
import "./App.css";

function App() {
  const { logs, setVolume } = useToastLogs();
  const [volume, setVolumeState] = useState(20); // デフォルト音量20
  const {
    settings,
    updateSettings,
    addReplacement,
    removeReplacement,
    addBlockedApp,
    removeBlockedApp,
  } = useSettings();
  
  // 変換リストの追加用の状態
  const [newReplacementFrom, setNewReplacementFrom] = useState("");
  const [newReplacementTo, setNewReplacementTo] = useState("");
  
  // 除外アプリの追加用の状態
  const [newBlockedApp, setNewBlockedApp] = useState("");
  const [newBlockedAppId, setNewBlockedAppId] = useState("");
  const [newBlockedAppIsRegex, setNewBlockedAppIsRegex] = useState(false);
  const [newBlockedAppIdIsRegex, setNewBlockedAppIdIsRegex] = useState(false);

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

  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0];
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

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
                            updateSettings({ speechTemplate: "{app}、{title}、{text}" })
                          }
                        >
                          リセット
                        </Button>
                      </div>
                      <FieldDescription>
                        使用可能なプレースホルダー: {"{app}"}, {"{title}"}, {"{text}"}
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
                          onChange={(e) => setNewReplacementFrom(e.target.value)}
                          placeholder="変換前（例: Chrome）"
                          className="flex-1"
                        />
                        <Input
                          value={newReplacementTo}
                          onChange={(e) => setNewReplacementTo(e.target.value)}
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

                {/* 音量設定 */}
                <FieldGroup>
                  <FieldLegend>音量設定</FieldLegend>
                  <Field>
                    <FieldLabel>音量: {volume}</FieldLabel>
                    <FieldContent>
                      <Slider
                        value={[volume]}
                        onValueChange={handleVolumeChange}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
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
                              onChange={(e) => setNewBlockedApp(e.target.value)}
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
                              onChange={(e) => setNewBlockedAppId(e.target.value)}
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
                              });
                              setNewBlockedApp("");
                              setNewBlockedAppId("");
                              setNewBlockedAppIsRegex(false);
                              setNewBlockedAppIdIsRegex(false);
                            }
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          追加
                        </Button>
                      </div>
                      <FieldDescription>
                        アプリ名またはアプリIDのいずれかを指定してください。正規表現を使用する場合は、スイッチをONにしてください。
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
                            <Menu className="h-5 w-5 ml-auto cursor-pointer" />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto" align="end">
                            <div className="grid gap-4">
                              {[
                                { label: "app", value: app },
                                { label: "app_id", value: app_id },
                                { label: "title", value: title },
                              ].map((item, index) => (
                                <div key={index} className="space-y-2">
                                  <h3 className="text-lg font-bold">
                                    {item.label}
                                  </h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
