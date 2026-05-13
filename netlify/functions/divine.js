// Netlify Functions: /.netlify/functions/divine
// Anthropic APIへの中継

const REQUIRED_FIELDS = [
  "category",
  "clan",
  "tenkaku",
  "animal",
  "animal_reason",
  "rarity",
  "population",
  "region",
  "era",
  "badge",
  "headline",
  "story",
  "divination_detail",
  "character",
  "talents",
  "lineage",
  "message",
  "manga"
];

function extractTextFromMessage(data) {
  if (!data || !Array.isArray(data.content)) return "";
  return data.content
    .filter((block) => block && block.type === "text")
    .map((block) => block.text || "")
    .join("")
    .trim();
}

function stripJsonWrapper(text) {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const unwrapped = fenced ? fenced[1] : text;
  const start = unwrapped.indexOf("{");
  const end = unwrapped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return unwrapped.trim();
  return unwrapped.slice(start, end + 1).trim();
}

function parseDivinationResult(data) {
  const rawText = extractTextFromMessage(data);
  if (!rawText) {
    throw new Error("AI応答が空です");
  }

  let result;
  try {
    result = JSON.parse(stripJsonWrapper(rawText));
  } catch (error) {
    console.error("JSON parse error:", error, "Raw:", rawText);
    throw new Error("AI応答のJSON解析に失敗しました");
  }

  const missing = REQUIRED_FIELDS.filter((field) => result[field] === undefined || result[field] === null);
  if (missing.length > 0) {
    throw new Error(`AI応答に必要な項目がありません: ${missing.join(", ")}`);
  }
  if (!Array.isArray(result.talents) || !Array.isArray(result.lineage) || !Array.isArray(result.manga)) {
    throw new Error("AI応答の配列項目が不正です");
  }

  return result;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "APIキーが設定されていません" }) };
  }

  try {
    const { myoji } = JSON.parse(event.body || "{}");
    if (!myoji) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "苗字が必要です" }) };
    }

    const prompt = `あなたは日本の家系・占術・歴史の最高権威であり、漫画原作者でもあります。「${myoji}」という苗字の先祖を鑑定してください。

以下のJSON形式のみで返答してください。前置きや後書きは一切不要です。コードブロックも不要です。

{
"category":"侍|貴族|神職|豪商|農民|土豪|職人|僧侶|漁師のいずれか",
"clan":"源氏系|平氏系|藤原系|橘系|蘇我系|物部系|豪族独立系|渡来系|不明のいずれか",
"tenkaku":苗字の総画数の整数,
"animal":"龍|虎|鷹|狐|狼|熊|鶴|馬|亀|牛|蛇|猿のいずれか",
"animal_reason":"なぜその動物か20文字以内",
"rarity":1から100の整数,
"population":日本国内の同苗字の推定人数の整数,
"region":"発祥地",
"era":"栄えた時代",
"badge":"称号12文字以内",
"headline":"承認欲求を満たすキャッチコピー25文字以内",
"story":"先祖の偉大さを讃える物語180文字",
"divination_detail":"五術統合解説250文字",
"character":"先祖の人物像250文字",
"talents":["才能1","才能2","才能3"],
"lineage":[
{"era":"平安","rank":"中程度","note":"始まり"},
{"era":"鎌倉","rank":"高","note":"台頭"},
{"era":"戦国","rank":"最高","note":"最盛期"},
{"era":"江戸","rank":"中程度","note":"安定"},
{"era":"明治","rank":"低","note":"転換"}
],
"message":"先祖から子孫への一人称メッセージ40文字以内",
"manga":[
{"scene":"場面の情景50文字","narration":"ナレーション80文字","dialogue":"先祖のセリフ25文字以内"},
{"scene":"場面の情景50文字","narration":"ナレーション80文字","dialogue":"先祖のセリフ25文字以内"},
{"scene":"場面の情景50文字","narration":"ナレーション80文字","dialogue":"先祖のセリフ25文字以内"},
{"scene":"現代・あなたへ向けて","narration":"先祖から現代のあなたへの誇りと希望のメッセージ80文字","dialogue":"血脈を讃える短いセリフ25文字以内"}
]
}

mangaは4コマ構成で、1-3コマは先祖の最も誇り高い瞬間を、4コマ目は現代のあなたへの励ましを描いてください。`;

    // Netlify Functionsの短い実行時間に収めるため、最速モデルを優先する。
    let res;
    const tryModels = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"];
    let lastErr = null;
    for (const modelName of tryModels) {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.ok) {
        console.log("Model used:", modelName);
        break;
      }
      lastErr = await res.text();
      console.error(`Model ${modelName} failed:`, res.status, lastErr);
      // 404以外（権限・レート制限など）はリトライしない
      if (res.status !== 404) break;
    }

    if (!res.ok) {
      const errText = lastErr || await res.text();
      console.error("All models failed:", res.status, errText);
      let detailMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          detailMsg = errJson.error.message;
        }
      } catch(_){}
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({ error: "Anthropic API: " + detailMsg, status: res.status })
      };
    }

    const data = await res.json();
    const result = parseDivinationResult(data);
    return { statusCode: 200, headers, body: JSON.stringify({ result, model: data.model }) };
  } catch (e) {
    console.error("Function error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, stack: e.stack }) };
  }
};
