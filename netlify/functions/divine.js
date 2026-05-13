// Netlify Functions: /.netlify/functions/divine
// Anthropic APIへの中継

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

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      let detailMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          detailMsg = errJson.error.message;
        }
      } catch(_){}
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ error: "Anthropic API: " + detailMsg, status: res.status })
      };
    }

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
