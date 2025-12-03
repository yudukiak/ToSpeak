import {
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  History,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PastNotificationsDialog } from "./PastNotificationsDialog";
import type { ToastLog } from "@/contexts/ToastLogContext";

interface NotificationLogProps {
  logs: ToastLog[];
}

function getLogConfig(log: { type: string; app?: string }) {
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
}

function formatTimestamp(timestamp: string) {
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
}

export function NotificationLog({ logs }: NotificationLogProps) {
  return (
    <div className="h-[calc(100dvh-2rem)] p-4 space-y-2">
      <h2 className="text-xl font-bold flex items-center gap-2">
        通知ログ
        <Badge variant="outline">
         <MessageSquare />
          {logs.length}件
        </Badge>
      </h2>
      <ScrollArea className="border rounded-md h-[calc(100dvh-6rem)]" type="always">
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
                    <PastNotificationsDialog
                      notifications={notifications}
                      title={title || ""}
                      message={message || ""}
                      timestamp={timestamp || ""}
                    />
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
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="ml-auto"><FileText /></Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto max-w-[80dvw]" align="end">
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
  );
}

