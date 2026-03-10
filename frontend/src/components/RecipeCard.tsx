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

export default function RecipeCard({
  result,
  fridge,
}: {
  result: SearchResult;
  fridge: string[];
}) {
  const matchedSet = new Set(result.matchedIngredients ?? []);

  const ingredientStates = fridge.map((item) => ({
    name: item,
    hit: matchedSet.has(item),
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