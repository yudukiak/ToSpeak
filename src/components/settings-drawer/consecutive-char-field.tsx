import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
} from "@/components/ui/field";

interface ConsecutiveCharFieldProps {
  consecutiveCharMinLength: number;
  onUpdate: (length: number) => void;
}

export function ConsecutiveCharField({
  consecutiveCharMinLength,
  onUpdate,
}: ConsecutiveCharFieldProps) {
  return (
    <Field>
      <FieldLabel>連続文字の短縮設定</FieldLabel>
      <FieldContent>
        <Input
          type="number"
          value={consecutiveCharMinLength || 0}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            onUpdate(isNaN(value) || value < 0 ? 0 : value);
          }}
          placeholder="0（無効）"
          className="w-full"
          min={0}
          aria-label="連続文字の短縮設定を入力"
        />
        <FieldDescription>
          同じ文字がn文字以上連続している場合、3文字に短縮されます。例: "=========" (9文字) → n=3 の場合 "===" (3文字) になります。0を指定すると無効です。
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}

