import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Field = {
  label: string;
  value: string;
  isRegex?: boolean;
};

type SettingsListItemViewProps = {
  fields: Field[];
  onEdit: () => void;
  onRemove: () => void;
  editAriaLabel: string;
  removeAriaLabel: string;
};

export function SettingsListItemView({
  fields,
  onEdit,
  onRemove,
  editAriaLabel,
  removeAriaLabel,
}: SettingsListItemViewProps) {
  return (
    <>
      <div className="flex-1 text-sm space-y-1 min-w-0">
        {fields.map((field, index) =>
          field.value ? (
            <div key={index} className="flex items-center gap-2 min-w-0">
              <span className="truncate">
                {field.label}：{field.value}
              </span>
              {field.isRegex && (
                <Badge variant="secondary" className="shrink-0">
                  正規表現
                </Badge>
              )}
            </div>
          ) : null
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onEdit}
        aria-label={editAriaLabel}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{editAriaLabel}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={removeAriaLabel}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{removeAriaLabel}</span>
      </Button>
    </>
  );
}
