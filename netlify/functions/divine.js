// Netlify Functions: /.netlify/functions/divine
// Anthropic APIへの中継（claude-haiku-4-5 / わかりやすい言葉版）

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

            const prompt = `あなたは現代の読者にもわかりやすく語る、家系と歴史のストーリーテラーです。「${myoji}」という苗字のご先祖を鑑定してください。

            【重要な言葉のルール】
            - 古語・難読漢字・専門用語は使わない（例：「興りし」「血脈」「傑物」「五術」などはNG）
            - 中学生でも一読で意味がわかる、現代の自然な日本語で書く
            - 「〜です・〜ます」調で温かく、誇らしげに
            - 漢字熟語より、やさしい言葉を優先（例：「商売の才能」「人を惹きつける力」など）
            - ただし、苗字の歴史的背景（時代名・地名・身分）は正確に
            - ご先祖を褒めて、読んだ人が嬉しくなる前向きな内容に

            【出力】JSONのみで返答（前置き・コードブロック・説明文は一切禁止）。各文字数厳守。
            {
            "category":"侍|貴族|神職|豪商|農民|土豪|職人|僧侶|漁師",
            "clan":"源氏系|平氏系|藤原系|橘系|蘇我系|物部系|豪族独立系|渡来系|不明",
            "tenkaku":総画数,
            "animal":"龍|虎|鷹|狐|狼|熊|鶴|馬|亀|牛|蛇|猿",
            "animal_reason":"なぜこの動物かやさしい言葉で20字以内",
            "rarity":1-100,
            "population":推定人数,
            "region":"発祥地（現代の都道府県名でOK）",
            "era":"栄えた時代（例：江戸時代中期）",
            "badge":"称号12字以内・わかりやすく",
            "headline":"キャッチコピー25字以内・読んで嬉しくなる現代語",
            "story":"ご先祖の活躍を物語風に120字・小学生でもわかる言葉で",
            "divination_detail":"占い的な解説150字・専門用語を使わず",
            "character":"ご先祖の人柄や性格150字・身近な言葉で",
            "talents":["才能を表す現代語3つ（例：交渉力・粘り強さ・気配り）"],
            "lineage":[
            {"era":"平安時代","rank":"中","note":"始まり"},
            {"era":"鎌倉時代","rank":"高","note":"頭角"},
            {"era":"戦国時代","rank":"最高","note":"最も活躍"},
            {"era":"江戸時代","rank":"中","note":"安定"},
            {"era":"明治時代","rank":"低","note":"変化"}
            ],
            "message":"ご先祖から子孫へのメッセージ40字以内・温かい言葉で",
            "manga":[
            {"scene":"場面の様子40字","narration":"説明文60字・やさしく","dialogue":"ご先祖のセリフ20字以内・現代でも通じる言葉"},
            {"scene":"場面の様子40字","narration":"説明文60字・やさしく","dialogue":"ご先祖のセリフ20字以内"},
            {"scene":"場面の様子40字","narration":"説明文60字・やさしく","dialogue":"ご先祖のセリフ20字以内"},
            {"scene":"現代のあなたへ","narration":"励ましの言葉60字","dialogue":"応援のひとこと20字以内"}
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
