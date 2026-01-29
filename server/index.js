import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/recipes/suggest
 * body: { fridge: string[], count?: number, servings?: number, timeLimitMin?: number, dislikes?: string[] }
 * return: { candidates: Candidate[] }
 */
app.post("/api/recipes/suggest", async (req, res) => {
  try {
    const {
      fridge = [],
      count = 4,
      servings,
      timeLimitMin,
      dislikes = [],
    } = req.body ?? {};

    if (!Array.isArray(fridge) || fridge.length === 0) {
      return res.status(400).json({ error: "fridge must be a non-empty array" });
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        candidates: {
          type: "array",
          minItems: 1,
          maxItems: Math.min(8, Math.max(1, count)),
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              oneLine: { type: "string" },
              timeMin: { type: "integer", minimum: 5, maximum: 120 },
              difficulty: { type: "integer", minimum: 1, maximum: 5 },
              mainIngredients: {
                type: "array",
                minItems: 2,
                maxItems: 6,
                items: { type: "string" },
              },
              seed: { type: "string" }
            },
            required: ["id", "title", "oneLine", "timeMin", "difficulty", "mainIngredients", "seed"],
          }
        }
      },
      required: ["candidates"]
    };

    const input = [
      {
        role: "system",
        content:
          "You are a helpful cooking assistant. Output MUST be valid JSON that matches the given schema. No extra keys.",
      },
      {
        role: "user",
        content: [
          "冷蔵庫の食材から、作りやすいレシピ候補を提案して。",
          "",
          `【冷蔵庫】${fridge.join(" / ")}`,
          dislikes?.length ? `【避けたい】${dislikes.join(" / ")}` : "",
          servings ? `【人数】${servings}人` : "",
          timeLimitMin ? `【制約】${timeLimitMin}分以内` : "",
          "",
          "ルール:",
          "- 候補は短く比較しやすく（タイトル、1行説明、時間、難易度、主な食材）",
          "- 冷蔵庫にない食材は基本入れない（調味料はOK）",
          "- seed は後で詳細生成に使うので、料理の要点が分かる短文にして（例: '鶏むね×味噌バター焼き、15分、フライパン')",
          `- 候補数は ${Math.min(8, Math.max(1, count))} 件`,
        ].filter(Boolean).join("\n"),
      },
    ];

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "RecipeSuggest",
          schema,
          strict: true,
        },
      },
    });


    const text = resp.output_text;
    const json = JSON.parse(text);

    // 念のためidをサーバー側で確実にユニークにする（モデルが被らせることがある）
    json.candidates = json.candidates.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
    }));

    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "suggest failed" });
  }
});

/**
 * POST /api/recipes/detail
 * body: { seed: string, fridge?: string[] }
 * return: Recipe
 */
app.post("/api/recipes/detail", async (req, res) => {
  try {
    const { seed, fridge = [] } = req.body ?? {};
    if (!seed || typeof seed !== "string") {
      return res.status(400).json({ error: "seed is required" });
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        ingredients: {
          type: "array",
          minItems: 3,
          maxItems: 25,
          items: { type: "string" },
        },
        steps: {
          type: "array",
          minItems: 3,
          maxItems: 20,
          items: { type: "string" },
        },
        tips: {
          type: "array",
          minItems: 0,
          maxItems: 8,
          items: { type: "string" },
        },
      },
      required: ["title", "ingredients", "steps", "tips"],
    };

    const input = [
      {
        role: "system",
        content:
          "You are a helpful cooking assistant. Output MUST be valid JSON that matches the given schema. No extra keys.",
      },
      {
        role: "user",
        content: [
          "次のseedの料理を、家庭向けに失敗しにくい詳細レシピにして。",
          "",
          `【seed】${seed}`,
          fridge?.length ? `【冷蔵庫】${fridge.join(" / ")}` : "",
          "",
          "ルール:",
          "- 材料は「食材名 + 分量」を1行ずつ（例: '卵 2個', 'キャベツ 1/4玉', '醤油 小さじ2')",
          "- 手順は番号にできる粒度で短く。火加減やタイミングが重要なら書く",
          "- 冷蔵庫にない食材は基本追加しない（塩/胡椒/油など最低限の調味料はOK）",
          "- tips には失敗しないコツ・代替案を入れてOK",
        ].filter(Boolean).join("\n"),
      },
    ];

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "RecipeSuggest",
          schema,
          strict: true,
        },
      },
    });


    const json = JSON.parse(resp.output_text);
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "detail failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API server listening on http://localhost:${PORT}`));
