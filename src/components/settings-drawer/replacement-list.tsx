import { useState } from "react";
import { toast } from "sonner";
import safeRegex from "safe-regex";
import { SettingsListItemView } from "./settings-list-item-view";
import { SettingsListItemEdit } from "./settings-list-item-edit";
import { SettingsListItemAddForm } from "./settings-list-item-add-form";
import type { Replacement } from "@/types/settings";

interface ReplacementListProps {
  replacements: Replacement[];
  onAdd: (replacement: Replacement) => void;
  onUpdate: (index: number, replacement: Replacement) => void;
  onRemove: (index: number) => void;
}

export function ReplacementList({
  replacements,
  onAdd,
  onUpdate,
  onRemove,
}: ReplacementListProps) {
  const [newReplacementFrom, setNewReplacementFrom] = useState("");
  const [newReplacementTo, setNewReplacementTo] = useState("");
  const [newReplacementIsRegex, setNewReplacementIsRegex] = useState(false);

  const [editingReplacementIndex, setEditingReplacementIndex] = useState<
    number | null
  >(null);
  const [editingReplacementFrom, setEditingReplacementFrom] = useState("");
  const [editingReplacementTo, setEditingReplacementTo] = useState("");
  const [editingReplacementIsRegex, setEditingReplacementIsRegex] =
    useState(false);

  return (
    <div className="space-y-2">
      <SettingsListItemAddForm
        label="新しい変換を追加"
        fields={[
          {
            key: "from",
            value: newReplacementFrom,
            placeholder: "変換前（例: Chrome）",
            ariaLabel: "変換前を入力",
            isRegex: newReplacementIsRegex,
            id: "new-replacement-regex",
          },
          {
            key: "to",
            value: newReplacementTo,
            placeholder: "変換後（例: クローム）",
            ariaLabel: "変換後を入力",
            isRegex: false,
            id: "",
          },
        ]}
        singleRegexSwitch={true}
        onFieldChange={(key, value) => {
          if (key === "from") {
            setNewReplacementFrom(value);
          } else if (key === "to") {
            setNewReplacementTo(value);
          }
        }}
        onRegexChange={(key, checked) => {
          if (key === "from") {
            setNewReplacementIsRegex(checked);
          }
        }}
        onAdd={() => {
          if (newReplacementFrom && newReplacementTo) {
            // 正規表現が有効な場合、safe-regexで安全性をチェック
            if (newReplacementIsRegex && !safeRegex(newReplacementFrom)) {
              toast.error(
                "危険な正規表現パターンが検出されました。変換前のパターンを変更してください。"
              );
              return;
            }
            onAdd({
              from: newReplacementFrom,
              to: newReplacementTo,
              isRegex: newReplacementIsRegex,
            });
            setNewReplacementFrom("");
            setNewReplacementTo("");
            setNewReplacementIsRegex(false);
          }
        }}
        addButtonLabel="追加"
        addButtonAriaLabel="変換を追加"
        description="正規表現を有効にすると、変換前のテキストを正規表現パターンとして扱います。無効の場合は通常の文字列置換です。各フィールドは100文字以上は登録できません。"
      />
      {replacements.length > 0 && (
        <div className="space-y-2">
          {replacements.map((replacement, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              {editingReplacementIndex === index ? (
                // 編集モード
                <SettingsListItemEdit
                  fields={[
                    {
                      key: "from",
                      value: editingReplacementFrom,
                      placeholder: "変換前",
                      ariaLabel: "変換前を編集",
                      isRegex: editingReplacementIsRegex,
                      id: `edit-replacement-regex-${index}`,
                    },
                    {
                      key: "to",
                      value: editingReplacementTo,
                      placeholder: "変換後",
                      ariaLabel: "変換後を編集",
                      isRegex: false,
                      id: "",
                    },
                  ]}
                  singleRegexSwitch={true}
                  onFieldChange={(key, value) => {
                    if (key === "from") {
                      setEditingReplacementFrom(value);
                    } else if (key === "to") {
                      setEditingReplacementTo(value);
                    }
                  }}
                  onRegexChange={(key, checked) => {
                    if (key === "from") {
                      setEditingReplacementIsRegex(checked);
                    }
                  }}
                  onSave={() => {
                    if (editingReplacementFrom && editingReplacementTo) {
                      // 正規表現が有効な場合、safe-regexで安全性をチェック
                      if (editingReplacementIsRegex && !safeRegex(editingReplacementFrom)) {
                        toast.error(
                          "危険な正規表現パターンが検出されました。変換前のパターンを変更してください。"
                        );
                        return;
                      }
                      onUpdate(index, {
                        from: editingReplacementFrom,
                        to: editingReplacementTo,
                        isRegex: editingReplacementIsRegex,
                      });
                      setEditingReplacementIndex(null);
                    }
                  }}
                  onCancel={() => {
                    setEditingReplacementIndex(null);
                  }}
                  saveAriaLabel="変換を保存"
                  cancelAriaLabel="変換をキャンセル"
                />
              ) : (
                // 表示モード
                <SettingsListItemView
                  fields={[
                    {
                      label: "変換前",
                      value: replacement.from,
                      isRegex: replacement.isRegex,
                    },
                    {
                      label: "変換後",
                      value: replacement.to,
                    },
                  ]}
                  onEdit={() => {
                    setEditingReplacementIndex(index);
                    setEditingReplacementFrom(replacement.from);
                    setEditingReplacementTo(replacement.to);
                    setEditingReplacementIsRegex(replacement.isRegex || false);
                  }}
                  onRemove={() => onRemove(index)}
                  editAriaLabel="変換を編集"
                  removeAriaLabel="変換を削除"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

