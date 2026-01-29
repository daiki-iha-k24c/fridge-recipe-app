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

export default function RecipeCard({
  candidate,
  onSelect,
}: {
  candidate: Candidate;
  onSelect: (c: Candidate) => void;
}) {
  const { title, oneLine, timeMin, difficulty, mainIngredients } = candidate;

  return (
    <div className="card">
      <div className="card-content">
        <div className="card-title">{title}</div>
        {oneLine && <div className="card-text">{oneLine}</div>}

        <div className="card-meta">
          {typeof timeMin === "number" && <span className="pill">⏱ {timeMin}分</span>}
          {typeof difficulty === "number" && (
            <span className="pill">⭐ 難易度 {difficulty}/5</span>
          )}
        </div>

        {Array.isArray(mainIngredients) && mainIngredients.length > 0 && (
          <div className="card-text">
            <b>主な食材:</b> {mainIngredients.join(" / ")}
          </div>
        )}
      </div>

      <div className="card-actions">
        <button onClick={() => onSelect(candidate)}>このレシピを見る</button>
      </div>
    </div>
  );
}
