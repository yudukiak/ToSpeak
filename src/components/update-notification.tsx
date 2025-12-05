import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import packageJson from "../../package.json";

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  releaseName?: string;
}

// 更新通知の設定型
interface UpdateNotificationConfig {
  title: string;
  description: string;
  primaryButtonLabel: string;
  primaryButtonAriaLabel: string;
  onPrimaryAction: () => void;
}

// 更新通知コンポーネントのProps型
interface UpdateNotificationContentProps {
  info: UpdateInfo;
  config: UpdateNotificationConfig;
  notificationId: string;
}

// 更新通知コンポーネント
const UpdateNotificationContent = ({ info, config, notificationId }: UpdateNotificationContentProps) => {
  const version = info.version.startsWith('v') ? info.version : `v${info.version}`;
  const releaseUrl = `https://github.com/yudukiak/ToSpeak/releases/tag/${version}`;

  const handleLater = () => {
    toast.dismiss(notificationId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <p className="font-semibold">{config.title}</p>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={config.onPrimaryAction}
          aria-label={config.primaryButtonAriaLabel}
        >
          {config.primaryButtonLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleLater}
          aria-label="あとで"
        >
          あとで
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (typeof window !== "undefined" && window.ipcRenderer) {
              window.ipcRenderer.openExternal(releaseUrl);
            }
          }}
          aria-label="リリースノート"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          リリースノート
        </Button>
      </div>
    </div>
  );
};

// 開発環境かどうかを判定
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export function UpdateNotification() {
  // 状態変数は将来の拡張用に保持（現在は直接通知を表示している）
  const [, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [, setIsDownloaded] = useState(false);

  // 更新が利用可能な場合の通知を表示（ダウンロードは開始しない）
  const showUpdateAvailableNotification = useCallback((info: UpdateInfo) => {
    const config: UpdateNotificationConfig = {
      title: `ToSpeak v${info.version} が利用可能です`,
      description: `ダウンロードしてインストールしますか？`,
      primaryButtonLabel: "ダウンロードする",
      primaryButtonAriaLabel: "ダウンロードする",
      onPrimaryAction: () => {
        if (typeof window !== "undefined" && window.ipcRenderer) {
          window.ipcRenderer.sendDownloadUpdate();
          toast.dismiss("update-available-notification");
          toast.info("更新ファイルのダウンロードを開始しました...", {
            duration: 3000,
            id: "update-downloading"
          });
        }
      },
    };
    toast.info(
      <UpdateNotificationContent
        info={info}
        config={config}
        notificationId="update-available-notification"
      />,
      {
        duration: Infinity,
        id: "update-available-notification",
      }
    );
  }, []);

  // ダウンロード完了時の通知を表示
  const showUpdateDownloadedNotification = useCallback((info: UpdateInfo) => {
    const config: UpdateNotificationConfig = {
      title: `ToSpeak v${info.version} のダウンロードが完了しました`,
      description: `再起動してインストールしますか？`,
      primaryButtonLabel: "再起動する",
      primaryButtonAriaLabel: "再起動する",
      onPrimaryAction: () => {
        if (typeof window !== "undefined" && window.ipcRenderer) {
          window.ipcRenderer.sendUpdateRestart();
        }
      },
    };
    toast.success(
      <UpdateNotificationContent
        info={info}
        config={config}
        notificationId="update-downloaded-notification"
      />,
      {
        duration: Infinity,
        id: "update-downloaded-notification",
      }
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ipcRenderer) {
      return;
    }

    const handleUpdateAvailable = (_event: unknown, info: UpdateInfo) => {
      console.log("更新が利用可能です:", info);
      setUpdateInfo(info);
      setIsDownloaded(false);
      // 更新が利用可能になった時点で通知を表示（ダウンロードは開始しない）
      showUpdateAvailableNotification(info);
    };

    const handleUpdateDownloaded = (_event: unknown, info: UpdateInfo) => {
      console.log("更新のダウンロードが完了しました:", info);
      setUpdateInfo(info);
      setIsDownloaded(true);
      // ダウンロード完了の通知を表示
      showUpdateDownloadedNotification(info);
    };

    window.ipcRenderer.on("update-available", handleUpdateAvailable);
    window.ipcRenderer.on("update-downloaded", handleUpdateDownloaded);

    return () => {
      window.ipcRenderer.off("update-available", handleUpdateAvailable);
      window.ipcRenderer.off("update-downloaded", handleUpdateDownloaded);
    };
  }, [showUpdateAvailableNotification, showUpdateDownloadedNotification]);

  // バージョン番号のパッチバージョン（3番目の数字）を+1する関数
  const incrementPatchVersion = (version: string): string => {
    const parts = version.split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2], 10);
      if (!isNaN(patch)) {
        parts[2] = (patch + 1).toString();
        return parts.join('.');
      }
    } else if (parts.length === 2) {
      // パッチバージョンがない場合は追加
      parts.push('1');
      return parts.join('.');
    }
    return version;
  };

  // 開発環境でのテスト用関数
  const testUpdateAvailable = () => {
    const nextVersion = incrementPatchVersion(packageJson.version);
    const testInfo: UpdateInfo = {
      version: nextVersion,
      releaseDate: new Date().toISOString(),
      releaseNotes: "テスト用の更新通知です",
      releaseName: `v${nextVersion}`
    };
    showUpdateAvailableNotification(testInfo);
  };

  const testUpdateDownloaded = () => {
    const nextVersion = incrementPatchVersion(packageJson.version);
    const testInfo: UpdateInfo = {
      version: nextVersion,
      releaseDate: new Date().toISOString(),
      releaseNotes: "テスト用の更新通知です",
      releaseName: `v${nextVersion}`
    };
    showUpdateDownloadedNotification(testInfo);
  };

  // 開発環境でのみテストボタンを表示
  if (isDev) {
    return (
      <div className="fixed bottom-4 left-4 z-1 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={testUpdateAvailable}
          aria-label="更新確認テスト"
        >
          更新確認テスト
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={testUpdateDownloaded}
          aria-label="ダウンロード完了テスト"
        >
          ダウンロード完了テスト
        </Button>
      </div>
    );
  }

  return null;
}
