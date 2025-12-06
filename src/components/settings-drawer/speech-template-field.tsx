import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
} from "@/components/ui/field";

interface SpeechTemplateFieldProps {
  speechTemplate: string;
  onUpdate: (speechTemplate: string) => void;
}

export function SpeechTemplateField({
  speechTemplate,
  onUpdate,
}: SpeechTemplateFieldProps) {
  return (
    <Field>
        <FieldLabel>テンプレート</FieldLabel>
        <FieldContent>
          <div className="flex gap-2">
            <Input
              value={speechTemplate}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 100) {
                  onUpdate(value);
                }
              }}
              placeholder="{app}、{title}、{text}"
              className="flex-1"
              aria-label="テンプレートを入力"
              maxLength={100}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onUpdate("{app}、{title}、{text}")}
              aria-label="テンプレートをリセット"
            >
              リセット
              <span className="sr-only">テンプレートをリセット</span>
            </Button>
          </div>
          <FieldDescription>
            使用可能なプレースホルダー: {"{app}"}, {"{title}"},{" "}
            {"{text}"}。100文字以上は登録できません。
          </FieldDescription>
        </FieldContent>
      </Field>
  );
}

