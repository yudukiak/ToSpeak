import { useState } from "react";
import { toast } from "sonner";
import safeRegex from "safe-regex";
import { SettingsListItemView } from "./settings-list-item-view";
import { SettingsListItemEdit } from "./settings-list-item-edit";
import { SettingsListItemAddForm } from "./settings-list-item-add-form";
import type { BlockedApp } from "@/types/settings";

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
    <div className="space-y-2">
      <SettingsListItemAddForm
        label="新しい除外アプリを追加"
        fields={fieldConfigs.map((config) => ({
          key: config.key,
          value: newFields[config.key].value,
          placeholder: config.placeholder,
          ariaLabel: config.placeholder,
          isRegex: newFields[config.key].isRegex,
          id: `${config.id}-regex`,
        }))}
        onFieldChange={(key, value) => {
          setNewFields((prev) => ({
            ...prev,
            [key]: { ...prev[key as FieldKey], value },
          }));
        }}
        onRegexChange={(key, checked) => {
          setNewFields((prev) => ({
            ...prev,
            [key]: { ...prev[key as FieldKey], isRegex: checked },
          }));
        }}
        onAdd={() => {
          if (newFields.app.value || newFields.app_id.value) {
            // 正規表現が有効なフィールドをチェック
            const regexFields = [
              { key: "app", value: newFields.app.value, isRegex: newFields.app.isRegex },
              { key: "app_id", value: newFields.app_id.value, isRegex: newFields.app_id.isRegex },
              { key: "title", value: newFields.title.value, isRegex: newFields.title.isRegex },
              { key: "text", value: newFields.text.value, isRegex: newFields.text.isRegex },
            ];

            for (const field of regexFields) {
              if (field.isRegex && field.value && !safeRegex(field.value)) {
                const fieldNames: Record<string, string> = {
                  app: "アプリ名",
                  app_id: "アプリID",
                  title: "タイトル",
                  text: "本文",
                };
                toast.error(
                  `${fieldNames[field.key]}の正規表現パターンが危険です。パターンを変更してください。`
                );
                return;
              }
            }

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
        addButtonLabel="追加"
        addButtonAriaLabel="除外アプリを追加"
        description="アプリ名またはアプリIDのいずれかを指定してください。タイトルや本文を指定すると、app/app_id × (title OR text) の組み合わせで除外されます。正規表現を使用する場合は、スイッチをONにしてください。各フィールドは100文字以上は登録できません。"
      />
      {blockedApps.length > 0 && (
        <div className="space-y-2">
          {blockedApps.map((blockedApp, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              {editingBlockedAppIndex === index ? (
                // 編集モード（4つのフィールドすべてを編集可能）
                <SettingsListItemEdit
                  fields={fieldConfigs.map((config) => ({
                    key: config.key,
                    value: editingFields[config.key].value,
                    placeholder: config.placeholder.split("（")[0],
                    ariaLabel: `${config.placeholder.split("（")[0]}を編集`,
                    isRegex: editingFields[config.key].isRegex,
                    id: `edit-blocked-${config.id}-regex-${index}`,
                    fieldName: config.key === "app" ? "アプリ名" : config.key === "app_id" ? "アプリID" : config.key === "title" ? "タイトル" : "本文",
                  }))}
                  onFieldChange={(key, value) => {
                    setEditingFields((prev) => ({
                      ...prev,
                      [key]: { ...prev[key as FieldKey], value },
                    }));
                  }}
                  onRegexChange={(key, checked) => {
                    setEditingFields((prev) => ({
                      ...prev,
                      [key]: { ...prev[key as FieldKey], isRegex: checked },
                    }));
                  }}
                  onSave={() => {
                    // 正規表現が有効なフィールドをチェック
                    const regexFields = [
                      { key: "app", value: editingFields.app.value, isRegex: editingFields.app.isRegex },
                      { key: "app_id", value: editingFields.app_id.value, isRegex: editingFields.app_id.isRegex },
                      { key: "title", value: editingFields.title.value, isRegex: editingFields.title.isRegex },
                      { key: "text", value: editingFields.text.value, isRegex: editingFields.text.isRegex },
                    ];

                    for (const field of regexFields) {
                      if (field.isRegex && field.value && !safeRegex(field.value)) {
                        const fieldNames: Record<string, string> = {
                          app: "アプリ名",
                          app_id: "アプリID",
                          title: "タイトル",
                          text: "本文",
                        };
                        toast.error(
                          `${fieldNames[field.key]}の正規表現パターンが危険です。パターンを変更してください。`
                        );
                        return;
                      }
                    }

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
                  onCancel={() => {
                    setEditingBlockedAppIndex(null);
                  }}
                  saveAriaLabel="除外アプリを保存"
                  cancelAriaLabel="除外アプリをキャンセル"
                />
              ) : (
                // 表示モード
                <SettingsListItemView
                  fields={[
                    {
                      label: "アプリ",
                      value: blockedApp.app || "",
                      isRegex: blockedApp.appIsRegex,
                    },
                    {
                      label: "ID",
                      value: blockedApp.app_id || "",
                      isRegex: blockedApp.appIdIsRegex,
                    },
                    {
                      label: "タイトル",
                      value: blockedApp.title || "",
                      isRegex: blockedApp.titleIsRegex,
                    },
                    {
                      label: "本文",
                      value: blockedApp.text || "",
                      isRegex: blockedApp.textIsRegex,
                    },
                  ]}
                  onEdit={() => {
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
                  onRemove={() => onRemove(index)}
                  editAriaLabel="除外アプリを編集"
                  removeAriaLabel="除外アプリを削除"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

