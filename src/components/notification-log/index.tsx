import { Bell, AlertCircle, CheckCircle2, Info, HelpCircle, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ToastLog } from "@/types/toast-log";
import { NotificationCard } from "./card";
import { NotificationsDialog } from "./dialog";
import { NotificationPopover } from "./popover";

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

export function NotificationLog({ logs }: NotificationLogProps) {
  console.log("NotificationLog - logs:", logs);
  return (
    <ScrollArea className="flex-1 min-h-0 border rounded-md" type="always">
      <div className="flex flex-col-reverse gap-2 p-2 pr-4">
        {logs.map((log, index) => {
          const { icon: Icon, title: logTitle } = getLogConfig(log);
          const { app, app_id, notification_id, text, timestamp, title, type, notifications } = log;

          const headerAction =
            type === "past_notifications" && notifications ? (
              <NotificationsDialog notifications={notifications} />
            ) : (
              <NotificationPopover app={app} app_id={app_id} title={title} text={text} />
            );

          return (
            <NotificationCard
              icon={Icon}
              title={title || ""}
              content={text || ""}
              timestamp={timestamp}
              logTitle={type === "notification" ? logTitle : undefined}
              headerAction={headerAction}
              cardKey={`${notification_id || index}-${timestamp}`}
              key={`${notification_id || index}-${timestamp}`}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
