// Netlify Functions: /.netlify/functions/divine
// Anthropic APIへの中継（claude-haiku-4-5 / 高速化）

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

          const prompt = `「${myoji}」の先祖を鑑定。JSONのみで返答（前置き・コードブロック禁止）。各文字数厳守。
          {
          "category":"侍|貴族|神職|豪商|農民|土豪|職人|僧侶|漁師",
          "clan":"源氏系|平氏系|藤原系|橘系|蘇我系|物部系|豪族独立系|渡来系|不明",
          "tenkaku":総画数,
          "animal":"龍|虎|鷹|狐|狼|熊|鶴|馬|亀|牛|蛇|猿",
          "animal_reason":"20字以内",
          "rarity":1-100,
          "population":推定人数,
          "region":"発祥地",
          "era":"栄えた時代",
          "badge":"称号12字以内",
          "headline":"キャッチコピー25字以内",
          "story":"先祖讃美120字",
          "divination_detail":"五術解説150字",
          "character":"人物像150字",
          "talents":["才能1","才能2","才能3"],
          "lineage":[
          {"era":"平安","rank":"中","note":"始まり"},
          {"era":"鎌倉","rank":"高","note":"台頭"},
          {"era":"戦国","rank":"最高","note":"最盛"},
          {"era":"江戸","rank":"中","note":"安定"},
          {"era":"明治","rank":"低","note":"転換"}
          ],
          "message":"先祖から子孫へ40字以内",
          "manga":[
          {"scene":"情景40字","narration":"ナレーション60字","dialogue":"セリフ20字以内"},
          {"scene":"情景40字","narration":"ナレーション60字","dialogue":"セリフ20字以内"},
          {"scene":"情景40字","narration":"ナレーション60字","dialogue":"セリフ20字以内"},
          {"scene":"現代のあなたへ","narration":"励まし60字","dialogue":"血脈讃美20字以内"}
          ]
          }`;

          const res = await fetch("https://api.anthropic.com/v1/messages", {
                      method: "POST",
                      headers: {
                                    "Content-Type": "application/json",
                                    "x-api-key": process.env.ANTHROPIC_API_KEY,
                                    "anthropic-version": "2023-06-01"
                      },
                      body: JSON.stringify({
                                    model: "claude-haiku-4-5",
                                    max_tokens: 2000,
                                    messages: [{ role: "user", content: prompt }]
                      })
          });

          if (!res.ok) {
                      const errText = await res.text();
                      let detailMsg = errText || "Unknown error";
                      try {
                                    const errJson = JSON.parse(errText);
                                    if (errJson.error && errJson.error.message) {
                                                    detailMsg = errJson.error.message;
                                    }
                      } catch(_){}
                      console.error("API failed:", res.status, errText);
                      return {
                                    statusCode: 200,
                                    headers,
                                    body: JSON.stringify({ error: "Anthropic API: " + detailMsg })
                      };
          }

          console.log("OK: claude-haiku-4-5");
                  const data = await res.json();
                  return { statusCode: 200, headers, body: JSON.stringify(data) };
        } catch (e) {
                  return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
        }
};
