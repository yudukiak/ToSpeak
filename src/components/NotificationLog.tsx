import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  History,
  FileText,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PastNotificationsDialog } from "./PastNotificationsDialog";
import type { ToastLog } from "@/contexts/ToastLogContext";
import type { LucideIcon } from "lucide-react";

interface NotificationLogProps {
  logs: ToastLog[];
}

interface NotificationCardProps {
  icon: LucideIcon;
  title: string;
  content?: string;
  timestamp?: string;
  logTitle?: string;
  footerContent?: React.ReactNode;
  headerAction?: React.ReactNode;
  cardKey: string;
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

function NotificationCard({
  icon: Icon,
  title,
  content,
  timestamp,
  logTitle,
  footerContent,
  headerAction,
  cardKey,
}: NotificationCardProps) {
  return (
    <Card key={cardKey}>
      <CardHeader className="gap-0">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="font-semibold">{title}</span>
          {headerAction}
        </CardTitle>
      </CardHeader>
      {content && (
        <CardContent className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {content}
        </CardContent>
      )}
      <CardFooter className="text-sm text-gray-400 dark:text-gray-600 justify-end gap-2">
        {footerContent || (
          <>
            {logTitle && (
              <>
                <span>{logTitle}</span>
                <span>-</span>
              </>
            )}
            <span>{timestamp ? formatTimestamp(timestamp) : ""}</span>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

export function NotificationLog({ logs }: NotificationLogProps) {
  return (
    <ScrollArea className="flex-1 min-h-0 border rounded-md" type="always">
        <div className="flex flex-col-reverse gap-2 p-2 pr-4">
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
                <NotificationCard
                  icon={Icon}
                  title={title || ""}
                  content={message}
                  timestamp={timestamp}
                  footerContent={
                    <PastNotificationsDialog
                      notifications={notifications}
                      title={title || ""}
                      message={message || ""}
                      timestamp={timestamp || ""}
                    />
                  }
                  cardKey={`past-notifications-${timestamp}`}
                />
              );
            }

            // 通常の通知
            const headerAction = (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <FileText />
                  </Button>
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
                        <h3 className="text-sm font-bold">{item.label}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );

            return (
              <NotificationCard
                icon={Icon}
                title={title || ""}
                content={text || message}
                timestamp={timestamp}
                logTitle={type === "notification" ? logTitle : undefined}
                headerAction={headerAction}
                cardKey={`${notification_id || index}-${timestamp}`}
              />
            );
          })}
        </div>
      </ScrollArea>
  );
}

