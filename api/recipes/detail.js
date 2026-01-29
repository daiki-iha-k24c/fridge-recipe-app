import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { seed, fridge = [] } = req.body ?? {};
    if (!seed || typeof seed !== "string") return res.status(400).json({ error: "seed is required" });

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        ingredients: { type: "array", minItems: 3, maxItems: 25, items: { type: "string" } },
        steps: { type: "array", minItems: 3, maxItems: 20, items: { type: "string" } },
        tips: { type: "array", minItems: 0, maxItems: 8, items: { type: "string" } }
      },
      required: ["title", "ingredients", "steps", "tips"]
    };

    const input = [
      { role: "system", content: "Output MUST be valid JSON that matches the schema. No extra keys." },
      {
        role: "user",
        content: [
          "次のseedの料理を、家庭向けに失敗しにくい詳細レシピにして。",
          `【seed】${seed}`,
          fridge?.length ? `【冷蔵庫】${fridge.join(" / ")}` : "",
          "- 材料は「食材名 + 分量」を1行ずつ",
          "- 手順は短く具体的に",
        ].filter(Boolean).join("\n"),
      },
    ];

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
      text: { format: { type: "json_schema", name: "RecipeDetail", schema, strict: true } },
    });

    const json = JSON.parse(resp.output_text);
    return res.status(200).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "detail failed" });
  }
}
