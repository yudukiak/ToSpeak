import { Button } from "@/components/ui/button";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { PastNotification } from "@/contexts/ToastLogContext";

interface PastNotificationsDialogProps {
  notifications: PastNotification[];
  title: string;
  message: string;
  timestamp: string;
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

export function PastNotificationsDialog({
  notifications,
  title,
  message,
  timestamp,
}: PastNotificationsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">詳細を表示</Button>
      </DialogTrigger>
      <DialogContent className="max-w-full! h-full">
        <DialogHeader className="text-left">
          <DialogTitle>過去の通知（{notifications.length}件）</DialogTitle>
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
                <TableHead className="min-w-[150px]">app</TableHead>
                <TableHead className="min-w-[150px]">app_id</TableHead>
                <TableHead className="min-w-[200px]">title</TableHead>
                <TableHead className="min-w-[300px]">text</TableHead>
                <TableHead className="min-w-[150px]">timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notif: PastNotification) => (
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
              ))}
            </TableBody>
          </Table>
          <ScrollBar className="" orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

