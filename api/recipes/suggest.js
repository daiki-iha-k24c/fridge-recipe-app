import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { ingredients = [], count = 4 } = req.body ?? {};

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const normalizedIngredients = ingredients
      .map((x) => String(x).trim())
      .filter(Boolean);

    const maxCount = Math.min(8, Math.max(1, Number(count) || 4));

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        candidates: {
          type: "array",
          minItems: 1,
          maxItems: maxCount,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              oneLine: { type: "string" },
              matchedIngredients: {
                type: "array",
                items: { type: "string" },
              },
              missingIngredients: {
                type: "array",
                items: { type: "string" },
              },
              imageUrl: { type: "string" },
              recipeUrl: { type: "string" },
              seed: { type: "string" },
            },
            required: [
              "id",
              "title",
              "oneLine",
              "matchedIngredients",
              "missingIngredients",
              "imageUrl",
              "recipeUrl",
              "seed",
            ],
          },
        },
      },
      required: ["candidates"],
    };

    const input = [
      {
        role: "system",
        content: "Output MUST be valid JSON that matches the schema. No extra keys.",
      },
      {
        role: "user",
        content: [
          "あなたは余り食材活用レシピの提案アシスタントです。",
          `【余っている食材】${normalizedIngredients.join(" / ")}`,
          `【候補数】${maxCount}件`,
          "",
          "要件:",
          "- ユーザーが入力した食材をできるだけ活用できる家庭料理を提案する",
          "- matchedIngredients には、入力食材の中でその料理に使えるものだけを入れる",
          "- missingIngredients には、入力食材に含まれていないが追加で必要そうなものを入れる",
          "- title は短く自然な料理名",
          "- oneLine は1文の短い説明",
          "- imageUrl は空文字でも可",
          "- recipeUrl は空文字でも可",
          "- seed には詳細生成用の短い説明文を入れる",
          "- 候補は、入力食材を多く使えそうなものを優先する",
          "",
          "重要:",
          "- timeMin や difficulty は不要",
          "- JSON以外の文章は出さない",
        ].join("\n"),
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
    return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "suggest failed" });
  }
}