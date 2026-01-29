import os, json
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class RecipeListRequest(BaseModel):
    ingredients: List[str]
    n: int = 4

class RecipeCandidate(BaseModel):
    id: str
    title: str
    short: str
    required: List[str]

class RecipeListResponse(BaseModel):
    candidates: List[RecipeCandidate]

@app.post("/ai-recipes", response_model=RecipeListResponse)
def ai_recipes(req: RecipeListRequest):
    fridge = []
    seen = set()
    for x in req.ingredients:
        s = x.strip()
        if s and s not in seen:
            fridge.append(s)
            seen.add(s)

    prompt = f"""
あなたは料理アシスタントです。
ユーザーが持っている材料: {", ".join(fridge)}

候補を {req.n} 件提案してください。
各候補は:
- id: 英数字の短いID
- title: 料理名（短く）
- short: 1文の説明
- required: 必要材料（調味料も必要なら入れる）

必ず **次の形式のJSONだけ** を返してください（前後に文章を付けない）:
{{"candidates":[{{"id":"...","title":"...","short":"...","required":["..."]}}]}}
"""

    try:
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )

        # ① まず文字列が取れてるか
        raw = (result.text or "").strip()
        print("RAW GEMINI RESPONSE:", raw)
        # ② JSON parse
        data = json.loads(raw)

        # ③ 最低限の形チェック（壊れてたら落とさず空返し）
        cands = data.get("candidates")
        if not isinstance(cands, list):
            return {"candidates": []}

        # 候補の必須キーが無いものを除外
        cleaned = []
        for c in cands:
            if not isinstance(c, dict):
                continue
            if not all(k in c for k in ["id", "title", "short", "required"]):
                continue
            if not isinstance(c["required"], list):
                c["required"] = []
            cleaned.append(c)

        return {"candidates": cleaned[: req.n]}

    except Exception as e:
        # 開発中はログ出す（原因が分かる）
        print("ai_recipes error:", repr(e))
        # フロントが落ちないように必ず返す
        return {"candidates": []}

    fridge = []
    seen = set()
    for x in req.ingredients:
        s = x.strip()
        if s and s not in seen:
            fridge.append(s)
            seen.add(s)

    prompt = f"""
あなたは料理アシスタントです。
ユーザーが持っている材料: {", ".join(fridge)}

候補を {req.n} 件提案してください。
各候補は:
- id: 英数字の短いID
- title: 料理名（短く）
- short: 1文の説明
- required: 必要材料（調味料も必要なら入れる）

必ずJSONで返す:
{{"candidates":[{{"id":"...","title":"...","short":"...","required":["..."]}}]}}
"""

    result = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )

    data = json.loads(result.text)
    return data


class RecipeDetailRequest(BaseModel):
    ingredients: List[str]
    title: str
    required: List[str]

class RecipeDetailResponse(BaseModel):
    title: str
    required: List[str]
    missing: List[str]
    steps: List[str]
    cookpad_search_url: str



@app.post("/ai-recipe-detail", response_model=RecipeDetailResponse)
def ai_recipe_detail(req: RecipeDetailRequest):
    fridge = []
    seen = set()
    for x in req.ingredients:
        s = x.strip()
        if s and s not in seen:
            fridge.append(s)
            seen.add(s)

    fridge_set = set(fridge)
    required_set = set([x.strip() for x in req.required if x.strip()])
    missing = sorted(list(required_set - fridge_set))

    prompt = f"""
あなたは家庭料理のアシスタントです。
特定のレシピサイト（クックパッド等）の文章を要約・転載してはいけません。
一般的な家庭料理として成立する作り方を、独自に再構成してください。

料理名: {req.title}
手持ち食材: {", ".join(fridge)}
不足の可能性がある材料: {", ".join(missing) if missing else "なし"}

制約:
- 分量は数値で書かない（「適量」「お好み」でOK）
- 手順は6〜9ステップ
- 特定個人の工夫や口調を避ける
- 一般的で安全な調理手順にする
- 最後に注意点を1行入れる

必ずJSONで返す:
{{"steps":["...","..."]}}
"""

    result = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )

    try:
        steps_data = json.loads(result.text)
        steps = steps_data.get("steps") or []
        if not isinstance(steps, list):
            steps = []
    except Exception:
        steps = []


    return {
        "title": req.title,
        "required": sorted(list(required_set)),
        "missing": missing,
        "steps": steps,
        "cookpad_search_url": f"https://cookpad.com/search/{req.title}",
    }


