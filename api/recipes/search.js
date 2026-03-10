export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

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

    const r = await fetch(url);
    const data = await r.json();
    return (data.items ?? []).map((v) => v.id.videoId);
  }

  async function getVideoDetails(videoIds) {
    if (videoIds.length === 0) return [];

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(
      ","
    )}&key=${YOUTUBE_API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();
    return data.items ?? [];
  }

  try {
    const rawIngredients = req.body.ingredients;

    if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) {
      return res
        .status(400)
        .json({ error: "ingredients must be a non-empty array" });
    }

    const ingredients = normalizeIngredients(rawIngredients);
    const combos = [];

    if (ingredients.length === 1) combos.push([ingredients[0]]);
    if (ingredients.length === 2) combos.push([ingredients[0], ingredients[1]]);
    if (ingredients.length === 3) {
      combos.push(ingredients);
      combos.push([ingredients[0], ingredients[1]]);
      combos.push([ingredients[0], ingredients[2]]);
      combos.push([ingredients[1], ingredients[2]]);
    }

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
          videoMap.get(id).score += score;
        }
      });
    }

    const results = Array.from(videoMap.values()).sort((a, b) => b.score - a.score);
    return res.status(200).json({ results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "search failed" });
  }
}