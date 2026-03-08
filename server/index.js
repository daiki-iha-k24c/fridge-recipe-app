import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

function normalizeIngredients(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x).trim())
    .filter(Boolean)
    .filter((v, i, self) => self.indexOf(v) === i);
}

function buildCookpadSearchResult(keyword) {
  const encodedKeyword = encodeURIComponent(keyword);

  return {
    id: crypto.randomUUID(),
    title: `Cookpadで「${keyword}」を検索`,
    imageUrl: "",
    recipeUrl: `https://cookpad.com/search/${encodedKeyword}`,
    siteName: "Cookpad",
  };
}

function buildRakutenSearchResult(keyword) {
  const encodedKeyword = encodeURIComponent(keyword);

  return {
    id: crypto.randomUUID(),
    title: `楽天レシピで「${keyword}」を検索`,
    imageUrl: "",
    recipeUrl: `https://recipe.rakuten.co.jp/search/${encodedKeyword}/`,
    siteName: "楽天レシピ",
  };
}

async function fetchRakutenCategories() {
  const appId = process.env.RAKUTEN_APP_ID;

  if (!appId) {
    throw new Error("RAKUTEN_APP_ID is missing");
  }

  const url =
    `https://openapi.rakuten.co.jp/recipems/api/Recipe/CategoryList/20170426` +
    `?applicationId=${encodeURIComponent(appId)}&categoryType=small&format=json`;

  const r = await fetch(url);

  if (!r.ok) {
    throw new Error(`Rakuten CategoryList failed: ${r.status}`);
  }

  const data = await r.json();
  return Array.isArray(data?.result?.small) ? data.result.small : [];
}

async function fetchRakutenRanking(categoryId) {
  const appId = process.env.RAKUTEN_APP_ID;

  if (!appId) {
    throw new Error("RAKUTEN_APP_ID is missing");
  }

  const url =
    `https://openapi.rakuten.co.jp/recipems/api/Recipe/CategoryRanking/20170426` +
    `?applicationId=${encodeURIComponent(appId)}` +
    `&categoryId=${encodeURIComponent(categoryId)}` +
    `&format=json`;

  const r = await fetch(url);

  if (!r.ok) {
    throw new Error(`Rakuten CategoryRanking failed: ${r.status}`);
  }

  const data = await r.json();
  return Array.isArray(data?.result) ? data.result : [];
}

function scoreCategory(name, ingredients) {
  let score = 0;
  const lower = String(name || "").toLowerCase();

  for (const ing of ingredients) {
    if (lower.includes(String(ing).toLowerCase())) score += 2;
  }

  return score;
}

app.post("/api/recipes/search", async (req, res) => {
  try {
    const { ingredients = [] } = req.body ?? {};
    console.log("SEARCH BODY:", req.body);

    const normalizedIngredients = normalizeIngredients(ingredients);

    if (normalizedIngredients.length === 0) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const keyword = normalizedIngredients.join(" ");
    const cookpadResult = buildCookpadSearchResult(keyword);
    const rakutenSearchResult = buildRakutenSearchResult(keyword);

    let rakutenResults = [];

    try {
      console.log("RAKUTEN_APP_ID exists:", Boolean(process.env.RAKUTEN_APP_ID));

      const categories = await fetchRakutenCategories();
      console.log("Rakuten categories:", categories.length);

      const scoredCategories = categories
        .map((c) => ({
          id: c.categoryId,
          name: c.categoryName,
          score: scoreCategory(c.categoryName, normalizedIngredients),
        }))
        .sort((a, b) => b.score - a.score);

      let topCategories = scoredCategories.filter((c) => c.score > 0).slice(0, 3);

      if (topCategories.length === 0) {
        const fallbackNames = ["野菜", "肉", "魚", "汁物", "ご飯もの", "麺", "鍋"];
        topCategories = scoredCategories
          .filter((c) => fallbackNames.some((name) => c.name.includes(name)))
          .slice(0, 3);
      }

      if (topCategories.length === 0) {
        topCategories = scoredCategories.slice(0, 3);
      }

      console.log("Top categories:", topCategories);

      const lists = await Promise.all(
        topCategories.map((c) => fetchRakutenRanking(c.id))
      );

      rakutenResults = lists
        .flat()
        .map((r) => ({
          id: crypto.randomUUID(),
          title: r.recipeTitle || "楽天レシピ",
          imageUrl: r.foodImageUrl || r.mediumImageUrl || r.smallImageUrl || "",
          recipeUrl: r.recipeUrl || "",
          siteName: "楽天レシピ",
        }))
        .filter((r) => r.recipeUrl)
        .slice(0, 8);

      console.log("Rakuten results:", rakutenResults.length);
    } catch (rakutenError) {
      console.error("Rakuten error:", rakutenError);
      rakutenResults = [];
    }

    return res.json({
      results: [cookpadResult, rakutenSearchResult, ...rakutenResults],
    });
  } catch (e) {
    console.error("SEARCH API ERROR:", e);
    return res.status(500).json({
      error: "search failed",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log("RAKUTEN_APP_ID exists:", Boolean(process.env.RAKUTEN_APP_ID));
});