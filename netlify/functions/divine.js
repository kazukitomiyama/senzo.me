// Netlify Functions: /.netlify/functions/divine
// Anthropic APIへの中継
exports.handler = async (event) => {
    // CORS対応
    const headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Content-Type": "application/json"
    };

    // OPTIONSリクエスト(プリフライト)
    if (event.httpMethod === "OPTIONS") {
          return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
          return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    try {
          const { myoji } = JSON.parse(event.body || "{}");
          if (!myoji) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: "苗字が必要です" }) };
          }

      const prompt = `あなたは日本の家系・占術・歴史の最高権威です。「${myoji}」という苗字の先祖を鑑定してください。JSONのみで返答（前置き不要）:
      {"category":"侍|貴族|神職|豪商|農民|土豪|職人|僧侶|漁師","clan":"源氏系|平氏系|藤原系|橘系|蘇我系|物部系|豪族独立系|渡来系|不明","tenkaku":苗字総画数,"animal":"龍|虎|鷹|狐|狼|熊|鶴|馬|亀|牛|蛇|猿","animal_reason":"20文字以内","rarity":1から100,"region":"発祥地","era":"栄えた時代","badge":"称号12文字以内","headline":"承認欲求を最大化するコピー25文字以内","story":"先祖の偉大さを讃える物語180文字","divination_detail":"五術統合解説250文字","character":"先祖の人物像250文字","talents":["才能1","才能2","才能3"],"lineage":[{"era":"平安","rank":"中程度","note":"始まり"},{"era":"鎌倉","rank":"高","note":"台頭"},{"era":"戦国","rank":"最高","note":"最盛期"},{"era":"江戸","rank":"中程度","note":"安定"},{"era":"明治","rank":"低","note":"転換"}],"message":"先祖から一人称で40文字以内"}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                        "Content-Type": "application/json",
                        "x-api-key": process.env.ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01"
              },
              body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1200,
                        messages: [{ role: "user", content: prompt }]
              })
      });

      if (!res.ok) {
              const errText = await res.text();
              return { statusCode: res.status, headers, body: JSON.stringify({ error: "API呼び出し失敗", detail: errText }) };
      }

      const data = await res.json();
          return { statusCode: 200, headers, body: JSON.stringify(data) };
    } catch (e) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
};
