export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  function katakanaToHiragana(str) {
    return String(str).replace(/[ァ-ヶ]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
  }

  function normalizeText(str) {
    return katakanaToHiragana(String(str))
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  const INGREDIENT_ALIASES = {
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

  function canonicalizeIngredient(input) {
    const normalized = normalizeText(input);

    for (const [key, aliases] of Object.entries(INGREDIENT_ALIASES)) {
      if (aliases.some((alias) => normalizeText(alias) === normalized)) {
        return key;
      }
    }

    return normalized;
  }

  function getIngredientPatterns(ingredient) {
    const aliases = INGREDIENT_ALIASES[ingredient] ?? [ingredient];
    const normalizedAliases = aliases.map((alias) => normalizeText(alias));
    return [...new Set([ingredient, ...normalizedAliases])];
  }

  function normalizeIngredients(arr) {
    if (!Array.isArray(arr)) return [];

    return arr
      .map((x) => canonicalizeIngredient(x))
      .filter((x) => x.length > 0)
      .filter((v, i, self) => self.indexOf(v) === i)
      .slice(0, 3);
  }

  function scoreVideo(video, ingredients, scene, easyMode) {
    const title = normalizeText(video.snippet?.title ?? "");
    const description = normalizeText(video.snippet?.description ?? "");

    let score = 0;
    const matched = [];

    ingredients.forEach((ing) => {
      const patterns = getIngredientPatterns(ing);
      let hitTitle = false;
      let hitDescription = false;

      for (const pattern of patterns) {
        if (title.includes(pattern)) {
          hitTitle = true;
          break;
        }
      }

      if (!hitTitle) {
        for (const pattern of patterns) {
          if (description.includes(pattern)) {
            hitDescription = true;
            break;
          }
        }
      }

      if (hitTitle) {
        score += 3;
        matched.push(ing);
      } else if (hitDescription) {
        score += 1;
        matched.push(ing);
      }
    });

    if (scene && scene !== "指定なし") {
      const normalizedScene = normalizeText(scene);
      if (title.includes(normalizedScene)) {
        score += 2;
      } else if (description.includes(normalizedScene)) {
        score += 1;
      }
    }

    if (easyMode) {
      const easyWords = ["簡単", "かんたん", "時短", "すぐできる", "10分", "15分"];
      for (const word of easyWords) {
        const normalizedWord = normalizeText(word);
        if (title.includes(normalizedWord)) {
          score += 2;
          break;
        }
        if (description.includes(normalizedWord)) {
          score += 1;
          break;
        }
      }
    }

    return { score, matched };
  }

  async function searchYoutube(keyword) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(
      keyword
    )}&key=${YOUTUBE_API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok || data.error) {
      throw new Error(
        `YouTube search failed: status=${r.status} body=${JSON.stringify(data)}`
      );
    }

    return (data.items ?? []).map((v) => v.id?.videoId).filter(Boolean);
  }

  async function getVideoDetails(videoIds) {
    if (videoIds.length === 0) return [];

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(
      ","
    )}&key=${YOUTUBE_API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok || data.error) {
      throw new Error(
        `YouTube details failed: status=${r.status} body=${JSON.stringify(data)}`
      );
    }

    return data.items ?? [];
  }

  try {
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "YOUTUBE_API_KEY is missing" });
    }

    const rawIngredients = req.body?.ingredients;
    const scene = req.body?.scene ?? "指定なし";
    const easyMode = Boolean(req.body?.easyMode);

    if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) {
      return res
        .status(400)
        .json({ error: "ingredients must be a non-empty array" });
    }

    const ingredients = normalizeIngredients(rawIngredients);

    const combos = [];
    if (ingredients.length === 1) {
      combos.push([ingredients[0]]);
    }
    if (ingredients.length === 2) {
      combos.push([ingredients[0], ingredients[1]]);
    }
    if (ingredients.length === 3) {
      combos.push(ingredients);
      combos.push([ingredients[0], ingredients[1]]);
      combos.push([ingredients[0], ingredients[2]]);
      combos.push([ingredients[1], ingredients[2]]);
    }

    const querySuffixes = ["レシピ", "料理", "作り方"];
    const sceneWords = scene && scene !== "指定なし" ? [scene] : [];
    const easyWords = easyMode ? ["簡単"] : [];

    const videoMap = new Map();

    for (const combo of combos) {
      const baseIngredients = combo
        .map((ing) => {
          const aliases = INGREDIENT_ALIASES[ing];
          return aliases ? aliases[0] : ing;
        })
        .join(" ");

      for (const suffix of querySuffixes) {
        const keywordParts = [baseIngredients, ...sceneWords, ...easyWords, suffix];
        const keyword = keywordParts.join(" ").trim();

        const videoIds = await searchYoutube(keyword);
        const details = await getVideoDetails(videoIds);

        details.forEach((video) => {
          const { score, matched } = scoreVideo(video, ingredients, scene, easyMode);

          if (score === 0) return;

          const id = video.id;
          if (!id) return;

          if (!videoMap.has(id)) {
            videoMap.set(id, {
              id,
              title: video.snippet?.title ?? "タイトルなし",
              imageUrl:
                video.snippet?.thumbnails?.high?.url ||
                video.snippet?.thumbnails?.medium?.url ||
                video.snippet?.thumbnails?.default?.url ||
                "",
              recipeUrl: `https://www.youtube.com/watch?v=${id}`,
              score,
              matchedIngredients: matched,
            });
          } else {
            const existing = videoMap.get(id);
            existing.score += score;
            existing.matchedIngredients = [
              ...new Set([...(existing.matchedIngredients ?? []), ...matched]),
            ];
          }
        });
      }
    }

    const results = Array.from(videoMap.values()).sort((a, b) => b.score - a.score);

    return res.status(200).json({
      results,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "search failed",
    });
  }
}