import { useEffect, useRef, useState } from "react";

type VersionFile = {
  version: string;
};

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data: VersionFile = await res.json();
    return data.version;
  } catch (error) {
    console.error("version fetch error:", error);
    return null;
  }
}

export default function UpdateNotifier() {
  const initialVersionRef = useRef<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkVersion = async () => {
      const latestVersion = await fetchVersion();
      if (!latestVersion || !mounted) return;

      if (initialVersionRef.current === null) {
        initialVersionRef.current = latestVersion;
        return;
      }

      if (initialVersionRef.current !== latestVersion) {
        setHasUpdate(true);
      }
    };

    checkVersion();

    const interval = setInterval(checkVersion, 5000);

    const onFocus = () => {
      checkVersion();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!hasUpdate) return null;

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
        新しい更新があります
      </div>
      <div style={{ fontSize: 14, marginBottom: 12 }}>
        最新版が公開されました。再読み込みすると反映されます。
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          border: "none",
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        更新する
      </button>
    </div>
  );
}