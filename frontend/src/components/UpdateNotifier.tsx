import { useEffect, useState } from "react";

type VersionFile = {
  version: string;
};

const STORAGE_KEY = "fridge_app_seen_version";

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    const data: VersionFile = await res.json();
    return data.version;
  } catch (error) {
    console.error("version fetch error:", error);
    return null;
  }
}

export default function UpdateNotifier() {
  const [messageOpen, setMessageOpen] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      const currentVersion = await fetchVersion();
      if (!currentVersion) return;

      const seenVersion = localStorage.getItem(STORAGE_KEY);

      // 初回アクセス時は保存だけして通知しない
      if (!seenVersion) {
        localStorage.setItem(STORAGE_KEY, currentVersion);
        return;
      }

      // 前回見た版と違えば通知
      if (seenVersion !== currentVersion) {
        setMessageOpen(true);
      }

      // 今回の版を保存
      localStorage.setItem(STORAGE_KEY, currentVersion);
    };

    checkVersion();
  }, []);

  if (!messageOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        background: "#222",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        maxWidth: 320,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>
        アプリが更新されました
      </div>
      <div style={{ fontSize: 14, marginBottom: 12 }}>
        新しい内容が反映されています。
      </div>
      <button
        onClick={() => setMessageOpen(false)}
        style={{
          border: "none",
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        閉じる
      </button>
    </div>
  );
}