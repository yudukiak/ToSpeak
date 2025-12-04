import { ScrollText } from "lucide-react";
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { PastNotification } from "@/types/toast-log";

interface NotificationsDialogProps {
  notifications: PastNotification[];
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

export function NotificationsDialog({
  notifications
}: NotificationsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <ScrollText />
        </Button>
      </DialogTrigger>
      {/* top: 50%(中央寄せ) + 1rem(header) */}
      <DialogContent className="max-w-[calc(100dvw-10rem)]! top-[calc(50%+1rem)]">
        <DialogHeader className="text-left">
          <DialogTitle>過去の通知（{notifications.length}件）</DialogTitle>
          <DialogDescription>
            起動時に既に存在していた通知の一覧です
          </DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="max-w-[calc(100dvw-13rem)] h-[calc(100dvh-20rem)] **:data-[slot=scroll-area-thumb]:right-[-10px]"
          type="always"
        >
            <table>
            <TableHeader className="sticky top-0 bg-background z-1">
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
          </table>
          <ScrollBar orientation="horizontal" className="bottom-[-10px]!" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

