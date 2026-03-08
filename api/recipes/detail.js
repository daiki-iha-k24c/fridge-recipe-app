import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      seed,
      ingredients = [],
      title = "",
      recipeUrl = "",
      imageUrl = "",
    } = req.body ?? {};

    if (!seed || typeof seed !== "string") {
      return res.status(400).json({ error: "seed is required" });
    }

    const normalizedIngredients = Array.isArray(ingredients)
      ? ingredients.map((x) => String(x).trim()).filter(Boolean)
      : [];

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
          maxItems: 12,
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
          "Output MUST be valid JSON that matches the schema. No extra keys.",
      },
      {
        role: "user",
        content: [
          "あなたは家庭向けレシピ作成アシスタントです。",
          `【料理候補】${title || "未指定"}`,
          `【seed】${seed}`,
          normalizedIngredients.length
            ? `【余っている食材】${normalizedIngredients.join(" / ")}`
            : "",
          "",
          "要件:",
          "- 家庭で作りやすいレシピにする",
          "- ingredients は『食材名または材料名』の配列で返す",
          "- steps は短く具体的にする",
          "- tips は任意、無ければ空配列でよい",
          "- 余っている食材をできるだけ自然に使う",
          "- 分量はざっくりでもよい",
          "- JSON以外の文章は出さない",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ];

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "RecipeDetail",
          schema,
          strict: true,
        },
      },
    });

    const json = JSON.parse(resp.output_text);

    return res.status(200).json({
      ...json,
      recipeUrl: typeof recipeUrl === "string" ? recipeUrl : "",
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "detail failed" });
  }
}