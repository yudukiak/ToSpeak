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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DrawerFooter,
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
import { useToastLogs, PastNotification } from "./contexts/ToastLogContext";
import "./App.css";

function App() {
  const { logs, setVolume } = useToastLogs();
  const [volume, setVolumeState] = useState(20); // デフォルト音量20

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
          <DrawerContent className="">
            <DrawerHeader>
              <DrawerTitle>設定</DrawerTitle>
            </DrawerHeader>
            <div>
              {/* 音量設定 */}
              <div>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium min-w-[60px]">
                    音量: {volume}
                  </label>
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DrawerFooter>Footer</DrawerFooter>
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
