import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { Header } from "@/components/Header";
import { NotificationLog } from "@/components/notification-log";
import { SettingsDrawer } from "@/components/settings-drawer";
import { Badge } from "@/components/ui/badge";
import { useToastLogs } from "./contexts/use-toast-logs";
import { useSettings } from "./contexts/use-settings";
import "./App.css";

function App() {
  const { logs, setVolume, availableVoices, setVoice } = useToastLogs();
  const { settings } = useSettings();

  // 起動時に保存された音声設定を適用（初回のみ）
  const voiceAppliedRef = useRef(false);
  useEffect(() => {
    // 既に適用済みの場合はスキップ
    if (voiceAppliedRef.current) {
      return;
    }

    // 音声リストが読み込まれ、音声設定がある場合のみ適用
    if (settings.voiceName && availableVoices.length > 0) {
      // 利用可能な音声リストが読み込まれたら、保存された音声設定を適用
      setVoice(settings.voiceName);
      voiceAppliedRef.current = true;
    }
  }, [settings.voiceName, availableVoices.length, setVoice]);

  // 起動時に保存された音量設定を適用（初回のみ）
  const volumeAppliedRef = useRef(false);
  useEffect(() => {
    // 既に適用済みの場合はスキップ
    if (volumeAppliedRef.current) {
      return;
    }

    if (settings.volume !== undefined) {
      setVolume(settings.volume);
      volumeAppliedRef.current = true;
    }
  }, [settings.volume, setVolume]);

  return (
    <>
      <Header />
      <main className="h-[calc(100dvh-2rem)] p-4 flex flex-col">
        <section className="flex justify-between items-center shrink-0 mb-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            通知ログ
            <Badge variant="outline">
              <MessageSquare aria-hidden="true" />
              {logs.length}件
            </Badge>
          </h2>
          <SettingsDrawer />
        </section>
        <NotificationLog logs={logs} />
      </main>
    </>
  );
}

export default App;
