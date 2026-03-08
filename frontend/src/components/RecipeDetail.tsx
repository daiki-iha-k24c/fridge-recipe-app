import "../styles/card.css";

type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  tips?: string[];
  imageUrl?: string;
  recipeUrl?: string;
};

export default function RecipeDetail({
  recipe,
  onBack,
}: {
  recipe: Recipe;
  onBack: () => void;
}) {
  return (
    <div className="page">
      <a className="backlink" onClick={onBack}>
        ← 候補一覧に戻る
      </a>

      <div className="card" style={{ width: "100%" }}>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="card-img"
          />
        ) : null}

        <div className="card-content">
          <div className="card-title">{recipe.title}</div>

          {recipe.recipeUrl ? (
            <div className="card-text">
              <b>レシピURL:</b>{" "}
              <a href={recipe.recipeUrl} target="_blank" rel="noreferrer">
                レシピページを見る
              </a>
            </div>
          ) : null}

          <div className="card-text">
            <b>材料</b>
            <ul>
              {recipe.ingredients?.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>

          <div className="card-text">
            <b>手順</b>
            <ol>
              {recipe.steps?.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          </div>

          {recipe.tips?.length ? (
            <div className="card-text">
              <b>コツ</b>
              <ul>
                {recipe.tips.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}