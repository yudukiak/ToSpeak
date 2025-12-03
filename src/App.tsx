import { useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { NotificationLog } from "@/components/NotificationLog";
import { useToastLogs } from "./contexts/ToastLogContext";
import { useSettings } from "./contexts/SettingsContext";
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

  // 起動時に保存された音量設定を適用
  useEffect(() => {
    if (settings.volume !== undefined) {
      setVolume(settings.volume);
    }
  }, [settings.volume, setVolume]);

  return (
    <main className="h-dvh w-dvw">
      <Header />
      <NotificationLog logs={logs} />
    </main>
  );
}

export default App;
