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

export function BlockedAppList({
  blockedApps,
  onAdd,
  onUpdate,
  onRemove,
}: BlockedAppListProps) {
  const [newBlockedApp, setNewBlockedApp] = useState("");
  const [newBlockedAppId, setNewBlockedAppId] = useState("");
  const [newBlockedAppIsRegex, setNewBlockedAppIsRegex] = useState(false);
  const [newBlockedAppIdIsRegex, setNewBlockedAppIdIsRegex] = useState(false);
  const [newBlockedTitle, setNewBlockedTitle] = useState("");
  const [newBlockedTitleIsRegex, setNewBlockedTitleIsRegex] = useState(false);
  const [newBlockedText, setNewBlockedText] = useState("");
  const [newBlockedTextIsRegex, setNewBlockedTextIsRegex] = useState(false);

  const [editingBlockedAppIndex, setEditingBlockedAppIndex] = useState<
    number | null
  >(null);
  const [editingBlockedApp, setEditingBlockedApp] = useState("");
  const [editingBlockedAppIsRegex, setEditingBlockedAppIsRegex] =
    useState(false);
  const [editingBlockedAppId, setEditingBlockedAppId] = useState("");
  const [editingBlockedAppIdIsRegex, setEditingBlockedAppIdIsRegex] =
    useState(false);
  const [editingBlockedTitle, setEditingBlockedTitle] = useState("");
  const [editingBlockedTitleIsRegex, setEditingBlockedTitleIsRegex] =
    useState(false);
  const [editingBlockedText, setEditingBlockedText] = useState("");
  const [editingBlockedTextIsRegex, setEditingBlockedTextIsRegex] =
    useState(false);

  return (
    <FieldGroup>
      <FieldLegend>読ませないアプリ</FieldLegend>
      <Field>
        <FieldLabel>新しい除外アプリを追加</FieldLabel>
        <FieldContent>
          <div className="space-y-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={newBlockedApp}
                  onChange={(e) => setNewBlockedApp(e.target.value)}
                  placeholder="アプリ名（例: Google Chrome）"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newBlockedAppIsRegex}
                    onCheckedChange={setNewBlockedAppIsRegex}
                    id="app-regex"
                  />
                  <label
                    htmlFor="app-regex"
                    className="text-sm text-muted-foreground whitespace-nowrap"
                  >
                    正規表現
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newBlockedAppId}
                  onChange={(e) => setNewBlockedAppId(e.target.value)}
                  placeholder="アプリID（例: Chrome.YMHJ3T54TUN5QFISD4A7LWJ7MI）"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newBlockedAppIdIsRegex}
                    onCheckedChange={setNewBlockedAppIdIsRegex}
                    id="app-id-regex"
                  />
                  <label
                    htmlFor="app-id-regex"
                    className="text-sm text-muted-foreground whitespace-nowrap"
                  >
                    正規表現
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newBlockedTitle}
                  onChange={(e) => setNewBlockedTitle(e.target.value)}
                  placeholder="タイトル（app または app_id と組み合わせ）"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newBlockedTitleIsRegex}
                    onCheckedChange={setNewBlockedTitleIsRegex}
                    id="title-regex"
                  />
                  <label
                    htmlFor="title-regex"
                    className="text-sm text-muted-foreground whitespace-nowrap"
                  >
                    正規表現
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newBlockedText}
                  onChange={(e) => setNewBlockedText(e.target.value)}
                  placeholder="本文（app または app_id と組み合わせ）"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newBlockedTextIsRegex}
                    onCheckedChange={setNewBlockedTextIsRegex}
                    id="text-regex"
                  />
                  <label
                    htmlFor="text-regex"
                    className="text-sm text-muted-foreground whitespace-nowrap"
                  >
                    正規表現
                  </label>
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                if (newBlockedApp || newBlockedAppId) {
                  onAdd({
                    app: newBlockedApp || undefined,
                    app_id: newBlockedAppId || undefined,
                    appIsRegex: newBlockedAppIsRegex,
                    appIdIsRegex: newBlockedAppIdIsRegex,
                    title: newBlockedTitle || undefined,
                    titleIsRegex: newBlockedTitleIsRegex,
                    text: newBlockedText || undefined,
                    textIsRegex: newBlockedTextIsRegex,
                  });
                  setNewBlockedApp("");
                  setNewBlockedAppId("");
                  setNewBlockedAppIsRegex(false);
                  setNewBlockedAppIdIsRegex(false);
                  setNewBlockedTitle("");
                  setNewBlockedTitleIsRegex(false);
                  setNewBlockedText("");
                  setNewBlockedTextIsRegex(false);
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
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingBlockedApp}
                        onChange={(e) => setEditingBlockedApp(e.target.value)}
                        placeholder="アプリ名"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingBlockedAppIsRegex}
                          onCheckedChange={setEditingBlockedAppIsRegex}
                          id={`edit-blocked-app-regex-${index}`}
                        />
                        <label
                          htmlFor={`edit-blocked-app-regex-${index}`}
                          className="text-sm text-muted-foreground whitespace-nowrap"
                        >
                          正規表現
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingBlockedAppId}
                        onChange={(e) => setEditingBlockedAppId(e.target.value)}
                        placeholder="アプリID"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingBlockedAppIdIsRegex}
                          onCheckedChange={setEditingBlockedAppIdIsRegex}
                          id={`edit-blocked-app-id-regex-${index}`}
                        />
                        <label
                          htmlFor={`edit-blocked-app-id-regex-${index}`}
                          className="text-sm text-muted-foreground whitespace-nowrap"
                        >
                          正規表現
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingBlockedTitle}
                        onChange={(e) => setEditingBlockedTitle(e.target.value)}
                        placeholder="タイトル"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingBlockedTitleIsRegex}
                          onCheckedChange={setEditingBlockedTitleIsRegex}
                          id={`edit-blocked-title-regex-${index}`}
                        />
                        <label
                          htmlFor={`edit-blocked-title-regex-${index}`}
                          className="text-sm text-muted-foreground whitespace-nowrap"
                        >
                          正規表現
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingBlockedText}
                        onChange={(e) => setEditingBlockedText(e.target.value)}
                        placeholder="本文"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingBlockedTextIsRegex}
                          onCheckedChange={setEditingBlockedTextIsRegex}
                          id={`edit-blocked-text-regex-${index}`}
                        />
                        <label
                          htmlFor={`edit-blocked-text-regex-${index}`}
                          className="text-sm text-muted-foreground whitespace-nowrap"
                        >
                          正規表現
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const updated: BlockedApp = {};
                        if (editingBlockedApp) {
                          updated.app = editingBlockedApp;
                          updated.appIsRegex = editingBlockedAppIsRegex;
                        }
                        if (editingBlockedAppId) {
                          updated.app_id = editingBlockedAppId;
                          updated.appIdIsRegex = editingBlockedAppIdIsRegex;
                        }
                        if (editingBlockedTitle) {
                          updated.title = editingBlockedTitle;
                          updated.titleIsRegex = editingBlockedTitleIsRegex;
                        }
                        if (editingBlockedText) {
                          updated.text = editingBlockedText;
                          updated.textIsRegex = editingBlockedTextIsRegex;
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
                      setEditingBlockedApp(blockedApp.app || "");
                      setEditingBlockedAppIsRegex(blockedApp.appIsRegex || false);
                      setEditingBlockedAppId(blockedApp.app_id || "");
                      setEditingBlockedAppIdIsRegex(
                        blockedApp.appIdIsRegex || false
                      );
                      setEditingBlockedTitle(blockedApp.title || "");
                      setEditingBlockedTitleIsRegex(
                        blockedApp.titleIsRegex || false
                      );
                      setEditingBlockedText(blockedApp.text || "");
                      setEditingBlockedTextIsRegex(
                        blockedApp.textIsRegex || false
                      );
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

