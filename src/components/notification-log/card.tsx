import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

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

export function NotificationCard({ icon: Icon, title, content, timestamp, logTitle, footerContent, headerAction, cardKey }: NotificationCardProps) {
  return (
    <Card key={cardKey}>
      <CardHeader className="gap-0">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="font-semibold">{title}</span>
          {headerAction}
        </CardTitle>
      </CardHeader>
      {content && <CardContent className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{content}</CardContent>}
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
