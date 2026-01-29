import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { fridge = [], count = 4, servings, timeLimitMin, dislikes = [] } = req.body ?? {};
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
              mainIngredients: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
              seed: { type: "string" }
            },
            required: ["id", "title", "oneLine", "timeMin", "difficulty", "mainIngredients", "seed"]
          }
        }
      },
      required: ["candidates"]
    };

    const input = [
      { role: "system", content: "Output MUST be valid JSON that matches the schema. No extra keys." },
      {
        role: "user",
        content: [
          "冷蔵庫の食材から、作りやすいレシピ候補を提案して。",
          `【冷蔵庫】${fridge.join(" / ")}`,
          dislikes?.length ? `【避けたい】${dislikes.join(" / ")}` : "",
          servings ? `【人数】${servings}人` : "",
          timeLimitMin ? `【制約】${timeLimitMin}分以内` : "",
          `- 候補数は ${Math.min(8, Math.max(1, count))} 件`
        ].filter(Boolean).join("\n"),
      },
    ];

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
      // Responses API は text.format を使う（あなたが直した最新仕様）:contentReference[oaicite:2]{index=2}
      text: { format: { type: "json_schema", name: "RecipeSuggest", schema, strict: true } },
    });

    const json = JSON.parse(resp.output_text);
    return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "suggest failed" });
  }
}
