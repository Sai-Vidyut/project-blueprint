import { createBluebotProvider } from "../src/lib/ai/bluebot-provider.ts";
import { getAIProviderConfig } from "../src/lib/ai/config.ts";
import { AIProviderError } from "../src/lib/ai/types.ts";
import { mockBlueprint } from "../src/lib/utils/mockBlueprint.ts";

const tests = [
  "hello",
  "explain my architecture",
  "what database are you using and why?",
  "generate me a different stack",
  "change only the database",
  "replace the database with PostgreSQL",
  "make the architecture simpler",
  "what would you change about this Blueprint?",
];

async function main() {
  const provider = createBluebotProvider(getAIProviderConfig());
  const base = {
    blueprint: mockBlueprint,
    idea: "A shared task list app for small teams.",
    messages: [],
  };

  for (const msg of tests) {
    try {
      const result = await provider.chat({
        ...base,
        userMessage: msg,
        messages: base.messages,
      });
      console.log(
        "OK",
        JSON.stringify({
          msg: msg.slice(0, 48),
          modifies: result.modifiesBlueprint,
          messageLen: result.message.length,
          hasBlueprint: Boolean(result.blueprint),
          sections: result.changes?.changedSections,
        }),
      );
      base.messages = [
        ...base.messages,
        { role: "user", content: msg },
        { role: "assistant", content: result.message },
      ];
    } catch (error) {
      if (error instanceof AIProviderError) {
        console.log(
          "FAIL",
          JSON.stringify({
            msg: msg.slice(0, 48),
            kind: error.kind,
            provider: error.provider,
            status: error.statusCode,
            message: error.message,
            attempted: error.attemptedProviders,
          }),
        );
      } else {
        console.log("FAIL", msg, error);
      }
    }
  }
}

main().catch(console.error);
