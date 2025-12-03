import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldGroup,
  FieldLegend,
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
    <FieldGroup>
      <FieldLegend>読ませるテンプレート</FieldLegend>
      <Field>
        <FieldLabel>テンプレート</FieldLabel>
        <FieldContent>
          <div className="flex gap-2">
            <Input
              value={speechTemplate}
              onChange={(e) => onUpdate(e.target.value)}
              placeholder="{app}、{title}、{text}"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onUpdate("{app}、{title}、{text}")}
            >
              リセット
            </Button>
          </div>
          <FieldDescription>
            使用可能なプレースホルダー: {"{app}"}, {"{title}"},{" "}
            {"{text}"}
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

