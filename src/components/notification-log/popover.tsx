import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText } from "lucide-react";

interface NotificationPopoverProps {
  app?: string;
  app_id?: string;
  title?: string;
  text?: string;
}

export function NotificationPopover({ app, app_id, title, text }: NotificationPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto" aria-label="通知の詳細を表示">
          <FileText aria-hidden="true" />
          <span className="sr-only">通知の詳細を表示</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[80dvw]" align="end">
        <div className="grid gap-4">
          {[
            { label: "app", value: app || "" },
            { label: "app_id", value: app_id || "" },
            { label: "title", value: title || "" },
            { label: "text", value: text || "" },
          ].map((item, index) => (
            <div key={index} className="space-y-2">
              <h3 className="text-sm font-bold">{item.label}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">{item.value}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
