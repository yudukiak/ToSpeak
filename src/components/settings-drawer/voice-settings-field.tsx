import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldGroup,
  FieldLegend,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VoiceSettingsFieldProps {
  voiceName?: string;
  availableVoices: string[];
  onVoiceChange: (voiceName: string) => void;
}

export function VoiceSettingsField({
  voiceName,
  availableVoices,
  onVoiceChange,
}: VoiceSettingsFieldProps) {
  return (
    <FieldGroup>
      <FieldLegend>音声設定</FieldLegend>
      <Field>
        <FieldLabel>音声</FieldLabel>
        <FieldContent>
          <Select
            value={voiceName || ""}
            onValueChange={(value) => onVoiceChange(value || "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="音声を選択してください（読み上げ無効）" />
            </SelectTrigger>
            <SelectContent>
              {availableVoices.length > 0 ? (
                availableVoices.map((voice) => (
                  <SelectItem key={voice} value={voice}>
                    {voice}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  利用可能な音声がありません
                </div>
              )}
            </SelectContent>
          </Select>
          <FieldDescription>
            {voiceName
              ? `読み上げ音声: ${voiceName}（読み上げ有効）`
              : "読み上げに使用する音声を選択してください。音声を選択すると読み上げが開始されます。"}
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

