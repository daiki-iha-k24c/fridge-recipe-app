import "../styles/card.css";

type SearchResult = {
  id: string;
  title: string;
  imageUrl?: string;
  recipeUrl: string;
  siteName?: string;
};

export default function RecipeCard({
  result,
}: {
  result: SearchResult;
}) {
  return (
    <div className="card">
      {result.imageUrl ? (
        <img src={result.imageUrl} alt={result.title} className="card-img" />
      ) : null}

      <div className="card-content">
        <div className="card-title">{result.title}</div>

        {result.siteName ? (
          <div className="card-text">
            <b>サイト:</b> {result.siteName}
          </div>
        ) : null}
      </div>

      <div className="card-actions">
        <a href={result.recipeUrl} target="_blank" rel="noreferrer">
          サイトで見る
        </a>
      </div>
    </div>
  );
}