import { useState } from "react";
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  Menu,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useToastLogs } from "./contexts/ToastLogContext";
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
        {/* 音量設定 */}
        <div className="mb-4 p-4 border rounded-lg">
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
                } = log;
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
