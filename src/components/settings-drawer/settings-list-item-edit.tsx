import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type EditField = {
  key: string;
  value: string;
  placeholder: string;
  ariaLabel: string;
  isRegex: boolean;
  id: string;
  fieldName?: string;
};

type SettingsListItemEditProps = {
  fields: EditField[];
  singleRegexSwitch?: boolean;
  regexSwitchLabel?: string;
  onFieldChange: (key: string, value: string) => void;
  onRegexChange: (key: string, checked: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  saveAriaLabel: string;
  cancelAriaLabel: string;
};

export function SettingsListItemEdit({
  fields,
  singleRegexSwitch = false,
  regexSwitchLabel = "正規表現",
  onFieldChange,
  onRegexChange,
  onSave,
  onCancel,
  saveAriaLabel,
  cancelAriaLabel,
}: SettingsListItemEditProps) {
  return (
    <div className="flex-1 space-y-2">
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center gap-2">
            <Input
              value={field.value}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 100) {
                  onFieldChange(field.key, value);
                }
              }}
              placeholder={field.placeholder}
              className="flex-1"
              aria-label={field.ariaLabel}
              maxLength={100}
            />
            {(!singleRegexSwitch || field === fields[0]) && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={field.isRegex}
                  onCheckedChange={(checked) => onRegexChange(field.key, checked)}
                  id={field.id}
                  aria-label="正規表現を使用"
                />
                <label
                  htmlFor={field.id}
                  className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap"
                >
                  {singleRegexSwitch && field === fields[0]
                    ? "正規表現"
                    : regexSwitchLabel}
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          aria-label={saveAriaLabel}
        >
          <Check className="h-4 w-4 mr-1" aria-hidden="true" />
          保存
          <span className="sr-only">{saveAriaLabel}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          aria-label={cancelAriaLabel}
        >
          <X className="h-4 w-4 mr-1" aria-hidden="true" />
          キャンセル
          <span className="sr-only">{cancelAriaLabel}</span>
        </Button>
      </div>
    </div>
  );
}
