import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import type { BlockedApp } from "@/contexts/SettingsContext";

interface BlockedAppListProps {
  blockedApps: BlockedApp[];
  onAdd: (blockedApp: BlockedApp) => void;
  onUpdate: (index: number, blockedApp: BlockedApp) => void;
  onRemove: (index: number) => void;
}

type FieldKey = "app" | "app_id" | "title" | "text";

interface FieldConfig {
  key: FieldKey;
  placeholder: string;
  id: string;
}

const fieldConfigs: FieldConfig[] = [
  {
    key: "app",
    placeholder: "アプリ名（app）",
    id: "app",
  },
  {
    key: "app_id",
    placeholder: "アプリID（app_id）",
    id: "app-id",
  },
  {
    key: "title",
    placeholder: "タイトル（title）",
    id: "title",
  },
  {
    key: "text",
    placeholder: "本文（text）",
    id: "text",
  },
];

export function BlockedAppList({
  blockedApps,
  onAdd,
  onUpdate,
  onRemove,
}: BlockedAppListProps) {
  const [newFields, setNewFields] = useState<Record<FieldKey, { value: string; isRegex: boolean }>>({
    app: { value: "", isRegex: false },
    app_id: { value: "", isRegex: false },
    title: { value: "", isRegex: false },
    text: { value: "", isRegex: false },
  });

  const [editingBlockedAppIndex, setEditingBlockedAppIndex] = useState<
    number | null
  >(null);
  const [editingFields, setEditingFields] = useState<
    Record<FieldKey, { value: string; isRegex: boolean }>
  >({
    app: { value: "", isRegex: false },
    app_id: { value: "", isRegex: false },
    title: { value: "", isRegex: false },
    text: { value: "", isRegex: false },
  });

  return (
    <FieldGroup>
      <FieldLegend>読ませないアプリ</FieldLegend>
      <Field>
        <FieldLabel>新しい除外アプリを追加</FieldLabel>
        <FieldContent>
          <div className="space-y-2">
            <div className="space-y-2">
              {fieldConfigs.map((config) => (
                <div key={config.key} className="flex items-center gap-2">
                  <Input
                    value={newFields[config.key].value}
                    onChange={(e) =>
                      setNewFields((prev) => ({
                        ...prev,
                        [config.key]: { ...prev[config.key], value: e.target.value },
                      }))
                    }
                    placeholder={config.placeholder}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newFields[config.key].isRegex}
                      onCheckedChange={(checked) =>
                        setNewFields((prev) => ({
                          ...prev,
                          [config.key]: { ...prev[config.key], isRegex: checked },
                        }))
                      }
                      id={`${config.id}-regex`}
                    />
                    <label
                      htmlFor={`${config.id}-regex`}
                      className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer"
                    >
                      正規表現
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => {
                if (newFields.app.value || newFields.app_id.value) {
                  onAdd({
                    app: newFields.app.value || undefined,
                    app_id: newFields.app_id.value || undefined,
                    appIsRegex: newFields.app.isRegex,
                    appIdIsRegex: newFields.app_id.isRegex,
                    title: newFields.title.value || undefined,
                    titleIsRegex: newFields.title.isRegex,
                    text: newFields.text.value || undefined,
                    textIsRegex: newFields.text.isRegex,
                  });
                  setNewFields({
                    app: { value: "", isRegex: false },
                    app_id: { value: "", isRegex: false },
                    title: { value: "", isRegex: false },
                    text: { value: "", isRegex: false },
                  });
                }
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
          </div>
          <FieldDescription>
            アプリ名またはアプリIDのいずれかを指定してください。タイトルや本文を指定すると、app/app_id × (title OR text) の組み合わせで除外されます。正規表現を使用する場合は、スイッチをONにしてください。
          </FieldDescription>
        </FieldContent>
      </Field>
      {blockedApps.length > 0 && (
        <div className="space-y-2">
          {blockedApps.map((blockedApp, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              {editingBlockedAppIndex === index ? (
                // 編集モード（4つのフィールドすべてを編集可能）
                <div className="flex-1 space-y-2">
                  <div className="space-y-2">
                    {fieldConfigs.map((config) => (
                      <div key={config.key} className="flex items-center gap-2">
                        <Input
                          value={editingFields[config.key].value}
                          onChange={(e) =>
                            setEditingFields((prev) => ({
                              ...prev,
                              [config.key]: {
                                ...prev[config.key],
                                value: e.target.value,
                              },
                            }))
                          }
                          placeholder={config.placeholder.split("（")[0]}
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editingFields[config.key].isRegex}
                            onCheckedChange={(checked) =>
                              setEditingFields((prev) => ({
                                ...prev,
                                [config.key]: {
                                  ...prev[config.key],
                                  isRegex: checked,
                                },
                              }))
                            }
                            id={`edit-blocked-${config.id}-regex-${index}`}
                          />
                          <label
                            htmlFor={`edit-blocked-${config.id}-regex-${index}`}
                            className="text-sm text-muted-foreground whitespace-nowrap"
                          >
                            正規表現
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const updated: BlockedApp = {};
                        if (editingFields.app.value) {
                          updated.app = editingFields.app.value;
                          updated.appIsRegex = editingFields.app.isRegex;
                        }
                        if (editingFields.app_id.value) {
                          updated.app_id = editingFields.app_id.value;
                          updated.appIdIsRegex = editingFields.app_id.isRegex;
                        }
                        if (editingFields.title.value) {
                          updated.title = editingFields.title.value;
                          updated.titleIsRegex = editingFields.title.isRegex;
                        }
                        if (editingFields.text.value) {
                          updated.text = editingFields.text.value;
                          updated.textIsRegex = editingFields.text.isRegex;
                        }
                        onUpdate(index, updated);
                        setEditingBlockedAppIndex(null);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      保存
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingBlockedAppIndex(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                // 表示モード
                <>
                  <div className="flex-1 text-sm space-y-1">
                    {blockedApp.app && (
                      <div>
                        アプリ: {blockedApp.app}
                        {blockedApp.appIsRegex && (
                          <Badge variant="secondary" className="ml-2">
                            正規表現
                          </Badge>
                        )}
                      </div>
                    )}
                    {blockedApp.app_id && (
                      <div>
                        ID: {blockedApp.app_id}
                        {blockedApp.appIdIsRegex && (
                          <Badge variant="secondary" className="ml-2">
                            正規表現
                          </Badge>
                        )}
                      </div>
                    )}
                    {blockedApp.title && (
                      <div>
                        タイトル: {blockedApp.title}
                        {blockedApp.titleIsRegex && (
                          <Badge variant="secondary" className="ml-2">
                            正規表現
                          </Badge>
                        )}
                      </div>
                    )}
                    {blockedApp.text && (
                      <div>
                        本文: {blockedApp.text}
                        {blockedApp.textIsRegex && (
                          <Badge variant="secondary" className="ml-2">
                            正規表現
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingBlockedAppIndex(index);
                      setEditingFields({
                        app: {
                          value: blockedApp.app || "",
                          isRegex: blockedApp.appIsRegex || false,
                        },
                        app_id: {
                          value: blockedApp.app_id || "",
                          isRegex: blockedApp.appIdIsRegex || false,
                        },
                        title: {
                          value: blockedApp.title || "",
                          isRegex: blockedApp.titleIsRegex || false,
                        },
                        text: {
                          value: blockedApp.text || "",
                          isRegex: blockedApp.textIsRegex || false,
                        },
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </FieldGroup>
  );
}

