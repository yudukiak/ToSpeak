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
import type { Replacement } from "@/contexts/SettingsContext";

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
    <FieldGroup>
      <FieldLegend>変換リスト</FieldLegend>
      <Field>
        <FieldLabel>新しい変換を追加</FieldLabel>
        <FieldContent>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newReplacementFrom}
                onChange={(e) => setNewReplacementFrom(e.target.value)}
                placeholder="変換前（例: Chrome）"
                className="flex-1"
              />
              <Input
                value={newReplacementTo}
                onChange={(e) => setNewReplacementTo(e.target.value)}
                placeholder="変換後（例: クローム）"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => {
                  if (newReplacementFrom && newReplacementTo) {
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
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newReplacementIsRegex}
                onCheckedChange={setNewReplacementIsRegex}
                id="new-replacement-regex"
              />
              <label
                htmlFor="new-replacement-regex"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                正規表現
              </label>
            </div>
          </div>
          <FieldDescription>
            正規表現を有効にすると、変換前のテキストを正規表現パターンとして扱います。無効の場合は通常の文字列置換です。
          </FieldDescription>
        </FieldContent>
      </Field>
      {replacements.length > 0 && (
        <div className="space-y-2">
          {replacements.map((replacement, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              {editingReplacementIndex === index ? (
                // 編集モード
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={editingReplacementFrom}
                      onChange={(e) =>
                        setEditingReplacementFrom(e.target.value)
                      }
                      placeholder="変換前"
                      className="flex-1"
                    />
                    <Input
                      value={editingReplacementTo}
                      onChange={(e) => setEditingReplacementTo(e.target.value)}
                      placeholder="変換後"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingReplacementIsRegex}
                      onCheckedChange={setEditingReplacementIsRegex}
                      id={`edit-replacement-regex-${index}`}
                    />
                    <label
                      htmlFor={`edit-replacement-regex-${index}`}
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      正規表現として使用
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (editingReplacementFrom && editingReplacementTo) {
                          onUpdate(index, {
                            from: editingReplacementFrom,
                            to: editingReplacementTo,
                            isRegex: editingReplacementIsRegex,
                          });
                          setEditingReplacementIndex(null);
                        }
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
                        setEditingReplacementIndex(null);
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
                  <span className="flex-1 text-sm">
                    {replacement.from} → {replacement.to}
                    {replacement.isRegex && (
                      <Badge variant="secondary" className="ml-2">
                        正規表現
                      </Badge>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingReplacementIndex(index);
                      setEditingReplacementFrom(replacement.from);
                      setEditingReplacementTo(replacement.to);
                      setEditingReplacementIsRegex(replacement.isRegex || false);
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

