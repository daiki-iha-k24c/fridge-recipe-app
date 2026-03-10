import "../styles/card.css";

type SearchResult = {
  id: string;
  title: string;
  imageUrl?: string;
  recipeUrl: string;
  siteName?: string;
  matchedIngredients?: string[];
  score?: number;
};

function katakanaToHiragana(str: string) {
  return str.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function normalizeText(str: string) {
  return katakanaToHiragana(String(str))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

const INGREDIENT_ALIASES: Record<string, string[]> = {
  たまご: ["たまご", "卵", "玉子", "egg"],
  にら: ["にら", "ニラ", "韮"],
  ぎゅうにく: ["ぎゅうにく", "牛肉", "ビーフ"],
  ぶたにく: ["ぶたにく", "豚肉", "ポーク"],
  とりにく: ["とりにく", "鶏肉", "チキン"],
  たまねぎ: ["たまねぎ", "玉ねぎ", "玉葱", "タマネギ"],
  ねぎ: ["ねぎ", "ネギ", "葱", "長ねぎ", "長ネギ"],
  じゃがいも: ["じゃがいも", "ジャガイモ", "馬鈴薯"],
  にんじん: ["にんじん", "ニンジン", "人参"],
  きゃべつ: ["きゃべつ", "キャベツ"],
};

function canonicalizeIngredient(input: string) {
  const normalized = normalizeText(input);

  for (const [key, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    if (aliases.some((alias) => normalizeText(alias) === normalized)) {
      return key;
    }
  }

  return normalized;
}

export default function RecipeCard({
  result,
  fridge,
}: {
  result: SearchResult;
  fridge: string[];
}) {
  const matchedSet = new Set(
    (result.matchedIngredients ?? []).map(canonicalizeIngredient)
  );

  const ingredientStates = fridge.map((item) => ({
    name: item,
    hit: matchedSet.has(canonicalizeIngredient(item)),
  }));

  return (
    <div className="card">
      <a
        href={result.recipeUrl}
        target="_blank"
        rel="noreferrer"
        className="card-thumb-link"
        aria-label={`${result.title}をYouTubeで見る`}
      >
        {result.imageUrl ? (
          <img src={result.imageUrl} alt={result.title} className="card-img" />
        ) : (
          <div className="card-img-placeholder">動画サムネイル</div>
        )}
      </a>

      <div className="card-content">
        <div className="card-title">{result.title}</div>

        <div className="card-ingredient-row">
          {ingredientStates.map((item) => (
            <span
              key={item.name}
              className={`card-ingredient-chip ${
                item.hit ? "card-hit-chip" : "card-miss-chip"
              }`}
            >
              {item.hit ? "○" : "×"} {item.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}