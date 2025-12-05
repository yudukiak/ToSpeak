import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldGroup,
  FieldLegend,
} from "@/components/ui/field";

interface DuplicateNotificationFieldProps {
  duplicateNotificationIgnoreSeconds: number;
  onUpdate: (seconds: number) => void;
}

export function DuplicateNotificationField({
  duplicateNotificationIgnoreSeconds,
  onUpdate,
}: DuplicateNotificationFieldProps) {
  return (
    <FieldGroup>
      <FieldLegend>重複通知の無視</FieldLegend>
      <Field>
        <FieldLabel>
          無視時間（秒）: {duplicateNotificationIgnoreSeconds ?? 30}
        </FieldLabel>
        <FieldContent>
          <Input
            type="number"
            value={duplicateNotificationIgnoreSeconds ?? 30}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              onUpdate(isNaN(value) || value < 0 ? 0 : value);
            }}
            placeholder="30"
            className="w-full"
            min={0}
            aria-label="重複通知の無視時間を入力（秒）"
          />
          <FieldDescription>
            同じ内容の通知が指定秒数以内に送信された場合、読み上げをスキップします。0を指定すると無効（すべて読み上げ）です。
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

