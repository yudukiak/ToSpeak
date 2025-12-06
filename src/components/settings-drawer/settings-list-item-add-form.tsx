import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldDescription, FieldContent } from "@/components/ui/field";

type AddField = {
  key: string;
  value: string;
  placeholder: string;
  ariaLabel: string;
  isRegex: boolean;
  id: string;
};

type SettingsListItemAddFormProps = {
  label: string;
  fields: AddField[];
  singleRegexSwitch?: boolean;
  regexSwitchLabel?: string;
  onFieldChange: (key: string, value: string) => void;
  onRegexChange: (key: string, checked: boolean) => void;
  onAdd: () => void;
  addButtonLabel: string;
  addButtonAriaLabel: string;
  description: string;
};

export function SettingsListItemAddForm({
  label,
  fields,
  singleRegexSwitch = false,
  regexSwitchLabel = "正規表現",
  onFieldChange,
  onRegexChange,
  onAdd,
  addButtonLabel,
  addButtonAriaLabel,
  description,
}: SettingsListItemAddFormProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="space-y-2">
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
                      className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer"
                    >
                      {regexSwitchLabel}
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={onAdd}
            className="w-full"
            aria-label={addButtonAriaLabel}
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {addButtonLabel}
            <span className="sr-only">{addButtonAriaLabel}</span>
          </Button>
        </div>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
    </Field>
  );
}
