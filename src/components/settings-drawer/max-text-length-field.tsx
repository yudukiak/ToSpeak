import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
} from "@/components/ui/field";

interface MaxTextLengthFieldProps {
  maxTextLength: number;
  onUpdate: (maxTextLength: number) => void;
}

export function MaxTextLengthField({
  maxTextLength,
  onUpdate,
}: MaxTextLengthFieldProps) {
  return (
    <Field>
      <FieldLabel>最大文字数</FieldLabel>
      <FieldContent>
        <Input
          type="number"
          value={maxTextLength || 0}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            onUpdate(isNaN(value) || value < 0 ? 0 : value);
          }}
          placeholder="0（無制限）"
          className="w-full"
          min={0}
          aria-label="最大文字数を入力"
        />
        <FieldDescription>
          読み上げテキストがこの文字数を超える場合、「以下省略」に置き換えられます。0を指定すると無制限です。
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}

