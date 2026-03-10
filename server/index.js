import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

console.log("[server] USING INDEX.JS VERSION: multi-search");

function normalizeIngredients(arr) {
  if (!Array.isArray(arr)) return [];

  return arr
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0)
    .filter((v, i, self) => self.indexOf(v) === i)
    .slice(0, 3);
}

function scoreVideo(video, ingredients) {
  const title = video.snippet.title.toLowerCase();
  const description = video.snippet.description.toLowerCase();

  let score = 0;
  const matched = [];

  ingredients.forEach((ing) => {
    const norm = ing.toLowerCase();

    if (title.includes(norm)) {
      score += 3;
      matched.push(ing);
    } else if (description.includes(norm)) {
      score += 1;
      matched.push(ing);
    }
  });

  return { score, matched };
}

async function searchYoutube(keyword) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(
    keyword + " レシピ"
  )}&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items.map((v) => v.id.videoId);
}

async function getVideoDetails(videoIds) {
  if (videoIds.length === 0) return [];

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(
    ","
  )}&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items;
}

app.post("/api/recipes/search", async (req, res) => {
  try {
    const rawIngredients = req.body.ingredients;

    if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) {
      return res
        .status(400)
        .json({ error: "ingredients must be a non-empty array" });
    }

    const ingredients = normalizeIngredients(rawIngredients);

    console.log("[server] ingredients:", ingredients);

    const combos = [];

    if (ingredients.length === 1) {
      combos.push([ingredients[0]]);
    }

    if (ingredients.length === 2) {
      combos.push([ingredients[0], ingredients[1]]);
    }

    if (ingredients.length === 3) {
      combos.push(ingredients); // ABC
      combos.push([ingredients[0], ingredients[1]]); // AB
      combos.push([ingredients[0], ingredients[2]]); // AC
      combos.push([ingredients[1], ingredients[2]]); // BC
    }

    console.log("[server] search combos:", combos);

    const videoMap = new Map();

    for (const combo of combos) {
      const keyword = combo.join(" ");
      const videoIds = await searchYoutube(keyword);
      const details = await getVideoDetails(videoIds);

      details.forEach((video) => {
        const { score, matched } = scoreVideo(video, ingredients);

        if (score === 0) return;

        const id = video.id;

        if (!videoMap.has(id)) {
          videoMap.set(id, {
            id,
            title: video.snippet.title,
            imageUrl:
              video.snippet.thumbnails.high?.url ||
              video.snippet.thumbnails.medium?.url ||
              video.snippet.thumbnails.default?.url ||
              "",
            recipeUrl: `https://www.youtube.com/watch?v=${id}`,
            score,
            matchedIngredients: matched,
          });
        } else {
          const existing = videoMap.get(id);
          existing.score += score;
        }
      });
    }

    const results = Array.from(videoMap.values()).sort(
      (a, b) => b.score - a.score
    );

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "search failed" });
  }
});

app.listen(3000, () => {
  console.log("API server running on http://localhost:3000");
});