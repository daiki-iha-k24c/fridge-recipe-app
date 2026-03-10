import { useState } from "react";
import RecipeCard from "../components/RecipeCard";
import "../styles/card.css";
import "../styles/styles.css";

type SearchResult = {
  id: string;
  title: string;
  imageUrl?: string;
  recipeUrl: string;
  siteName?: string;
  matchedIngredients?: string[];
  score?: number;
};

export default function RecipePage() {
  const [ingredientInput, setIngredientInput] = useState("");
  const [fridge, setFridge] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  function addIngredient() {
    const v = ingredientInput.trim();
    if (!v) return;

    if (fridge.length >= 3) {
      setSearchError("食材を追加できるのは３つまでです");
      setIngredientInput("");
      return;
    }

    if (fridge.includes(v)) {
      setIngredientInput("");
      return;
    }

    setFridge((prev) => [...prev, v]);
    setIngredientInput("");
    setSearchError(null);
  }

  function removeIngredient(index: number) {
    setFridge((prev) => prev.filter((_, i) => i !== index));
  }

  function clearFridge() {
    setFridge([]);
    setIngredientInput("");
    setResults([]);
    setSearchError(null);
  }

  async function searchRecipes() {
    if (fridge.length === 0) {
      alert("食材を追加してね");
      return;
    }

    console.log("fridge before send:", fridge);

    setLoadingSearch(true);
    setSearchError(null);

    try {
      const r = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: fridge,
        }),
      });

      console.log("status", r.status);
      console.log("content-type", r.headers.get("content-type"));

      const text = await r.text();
      console.log("raw body", text);

      if (!r.ok) {
        throw new Error(await r.text());
      }

      const data = await r.json();
      console.log("parsed data", data);
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (e: any) {
      console.error(e);
      setSearchError(e?.message ?? "検索に失敗しました");
    } finally {
      setLoadingSearch(false);
    }
  }

  return (
    <div className="page">
      <div className="input-section">
        <div className="input-title">🥕 余っている食材を入力</div>

        <input
          className="ingredient-input"
          value={ingredientInput}
          onChange={(e) => setIngredientInput(e.target.value)}
          placeholder="食材を1つ入力（最大3つまで）"
          onKeyDown={(e) => {
            if (e.key === "Enter") addIngredient();
          }}
        />

        <div className="row-buttons">
          <button
            className="sub-button add-button"
            onClick={addIngredient}
            disabled={fridge.length >= 3}
          >
            追加
          </button>

          <button className="sub-button clear-button" onClick={clearFridge}>
            全クリア
          </button>
        </div>

        <div className="ingredient-state-card">
          {fridge.length === 0 ? (
            <div className="state-title">🥑 まだ食材がありません 🥑</div>
          ) : (
            <>
              <div className="state-title">🥬 入力した食材 🥬</div>

              <div className="ingredient-list in-card">
                {fridge.map((item, index) => (
                  <div key={index} className="ingredient-chip">
                    <span>{item}</span>
                    <button
                      className="chip-remove"
                      onClick={() => removeIngredient(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          className="recipe-button"
          onClick={searchRecipes}
          disabled={fridge.length === 0 || loadingSearch}
        >
          {loadingSearch ? "検索中..." : "🔎 この食材で料理を探す"}
        </button>
      </div>

      {searchError && (
        <div className="card" style={{ width: "100%", padding: 16, marginBottom: 16 }}>
          <div className="card-text" style={{ color: "red" }}>
            {searchError}
          </div>
        </div>
      )}

      {fridge.length > 0 && results.length > 0 && (
        <div className="grid">
          {results.map((result) => (
            <RecipeCard key={result.id} result={result} fridge={fridge} />))}
        </div>
      )}

      {loadingSearch && (
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
            <div className="card-text">
              余っている食材を使えそうな料理を探しています 🧊
            </div>
          </div>
        </div>
      )}
    </div>
  );
}