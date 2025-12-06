import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
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
  // voiceNameが存在するがavailableVoicesに含まれていない場合でも表示できるようにする
  const allVoices = voiceName && !availableVoices.includes(voiceName)
    ? [voiceName, ...availableVoices]
    : availableVoices;

  return (
    <Field>
      <FieldLabel>音声</FieldLabel>
      <FieldContent>
        <Select
          value={voiceName || undefined}
          onValueChange={(value) => onVoiceChange(value || "")}
          aria-label="音声を選択"
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="音声を選択してください（読み上げ無効）" />
          </SelectTrigger>
          <SelectContent>
            {allVoices.length > 0 ? (
              allVoices.map((voice) => (
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
  );
}

