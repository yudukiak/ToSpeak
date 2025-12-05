import {
  Field,
  FieldLabel,
  FieldContent,
  FieldGroup,
  FieldLegend,
} from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";

interface VolumeSettingsFieldProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeSettingsField({
  volume,
  onVolumeChange,
}: VolumeSettingsFieldProps) {
  return (
    <FieldGroup>
      <FieldLegend>音量設定</FieldLegend>
      <Field>
        <FieldLabel>音量: {volume || 20}</FieldLabel>
        <FieldContent>
          <Slider
            value={[volume || 20]}
            onValueChange={(values) => onVolumeChange(values[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
            aria-label="音量を調整"
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

