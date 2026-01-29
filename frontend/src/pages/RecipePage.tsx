import { useMemo, useState } from "react";
import RecipeDetail from "../components/RecipeDetail";
import "../styles/card.css";



type Candidate = {
  id: string;
  title: string;
  oneLine?: string;
  timeMin?: number;
  difficulty?: number;
  mainIngredients?: string[];
  seed?: string;
};

type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  tips?: string[];
};

;

export default function RecipePage() {

  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ✅ 冷蔵庫（追加式）
  const [ingredientInput, setIngredientInput] = useState("");
  const [fridge, setFridge] = useState<string[]>([]);

  // ✅ 候補・詳細（今はモック）
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  

  // 追加（Enterでも追加できるようにする）
  function addIngredient() {
    const v = ingredientInput.trim();
    if (!v) return;
    if (fridge.includes(v)) {
      setIngredientInput("");
      return;
    }
    setFridge([...fridge, v]);
    setIngredientInput("");
  }

  function removeIngredient(name: string) {
    setFridge(fridge.filter((x) => x !== name));
  }

  function clearFridge() {
    setFridge([]);
    setIngredientInput("");
    setCandidates([]); 
  }

  async function suggestRecipes() {
    if (fridge.length === 0) {
      alert("食材を追加してね");
      return;
    }

    setLoadingSuggest(true);
    setSuggestError(null);

    try {
      const r = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fridge, count: 4 }),
      });

      if (!r.ok) {
        throw new Error(await r.text());
      }

      const data = await r.json();
      setCandidates(data.candidates);
    } catch (e) {
      console.error(e);
      setSuggestError("候補の作成に失敗しました");
    } finally {
      setLoadingSuggest(false);
    }
  }


  // async function handleSelect(candidate: Candidate) {
  //   setSelectedCandidate(candidate);
  //   setRecipe(null);
  //   setDetailError(null);
  //   setLoadingDetail(true);

  //   try {
  //     const r = await fetch("/api/recipes/detail", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         seed: candidate.seed,
  //         fridge, // 冷蔵庫の中身も渡す（精度UP）
  //       }),
  //     });

  //     if (!r.ok) {
  //       throw new Error(await r.text());
  //     }

  //     const data = await r.json();
  //     setRecipe(data);
  //   } catch (e) {
  //     console.error(e);
  //     setDetailError("詳細レシピの生成に失敗しました");
  //   } finally {
  //     setLoadingDetail(false);
  //   }
  // }



  function handleBack() {
    setSelectedCandidate(null);
    setRecipe(null);
  }

  // 候補の絞り込み検索（必要なら残す。今は冷蔵庫UIが主なのでオフでもOK）
  // const filteredCandidates = useMemo(() => candidates, [candidates]);

  return (
    <div className="page">
      <div style={{ color: "red", fontSize: 12, padding: 8 }}>
  BUILD: 2026-01-29 candidates={candidates.length}
</div>

      {!selectedCandidate ? (
        <>
          {/* ✅ 冷蔵庫UI */}
          <div className="toolbar">
            <input
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              placeholder="食材を1つ入力（例：卵）"
              onKeyDown={(e) => {
                if (e.key === "Enter") addIngredient();
              }}
            />
            <button onClick={addIngredient}>追加</button>
            <button onClick={clearFridge}>全クリア</button>
            <button onClick={suggestRecipes}>レシピ提案</button>
          </div>

          {suggestError && (
            <div className="card" style={{ width: "100%", padding: 16, marginBottom: 16 }}>
              <div className="card-text" style={{ color: "red" }}>{suggestError}</div>
            </div>
          )}


          {/* ✅ チップ表示 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {fridge.length === 0 ? (
              <span className="pill">まだ食材がありません（追加してね）</span>
            ) : (
              fridge.map((x) => (
                <span key={x} className="pill" style={{ display: "inline-flex", gap: 8 }}>
                  {x}
                  <button
                    onClick={() => removeIngredient(x)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#999",
                    }}
                    aria-label={`${x} を削除`}
                    title="削除"
                  >
                    ✕
                  </button>
                </span>
              ))
            )}
          </div>

          {/* ✅ 候補一覧
          <div className="grid">
            {filteredCandidates.map((c) => (
              <RecipeCard key={c.id} candidate={c} onSelect={handleSelect} />
            ))}
          </div> */}
        </>
      ) : (
        <>
          {loadingDetail && (

            <div className="card" style={{ width: "100%", padding: 24 }}>
              <div className="card-text">レシピを作成中…🍳</div>
            </div>
          )}

          {detailError && (
            <div className="card" style={{ width: "100%", padding: 24 }}>
              <div className="card-text" style={{ color: "red" }}>
                {detailError}
              </div>
              <button onClick={handleBack}>戻る</button>
            </div>
          )}

          {recipe && !loadingDetail && (
            <RecipeDetail recipe={recipe} onBack={handleBack} />
          )}
        </>
      )}
      {loadingSuggest && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "min(520px, 100%)",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div className="card-title" style={{ marginBottom: 8 }}>
              検索中…
            </div>
            <div className="card-text">冷蔵庫をのぞいて候補を作っています🧊</div>

            <div style={{ marginTop: 16, fontSize: 12, color: "#777" }}>
              ※ 数秒かかることがあります
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
