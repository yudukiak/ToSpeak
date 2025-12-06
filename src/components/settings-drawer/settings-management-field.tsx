import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
} from "@/components/ui/field";

interface SettingsManagementFieldProps {
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
}

export function SettingsManagementField({
  onExport,
  onImport,
  onReset,
}: SettingsManagementFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Field>
        <FieldLabel>設定のインポート/エクスポート</FieldLabel>
        <FieldContent>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onExport} aria-label="設定をエクスポート">
              エクスポート
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              aria-label="設定をインポート"
            >
              インポート
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              aria-label="設定ファイルを選択"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onImport(file)
                    .then(() => {
                      alert("設定をインポートしました");
                    })
                    .catch((error) => {
                      alert(
                        `設定のインポートに失敗しました: ${error.message}`
                      );
                    });
                  // 同じファイルを再度選択できるようにリセット
                  e.target.value = "";
                }
              }}
            />
          </div>
          <FieldDescription>
            設定をJSONファイルとしてエクスポート、またはインポートできます。
          </FieldDescription>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>全リセット</FieldLabel>
        <FieldContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (
                confirm(
                  "すべての設定をリセットしますか？この操作は取り消せません。"
                )
              ) {
                onReset();
                alert("設定をリセットしました");
              }
            }}
            aria-label="すべての設定をリセット"
          >
            全リセット
          </Button>
          <FieldDescription>
            すべての設定をデフォルト値に戻します。この操作は取り消せません。
          </FieldDescription>
        </FieldContent>
      </Field>
    </>
  );
}

