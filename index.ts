import OpenAI from "openai";

// import write_document from "./tools/write_document.tool";
// import delete_document from "./tools/delete_document.tool";
// import get_index_tool from "./tools/get_index.tool";
import document_retrieval_tool from "./tools/document_retrieval.tool";
import document_generation_tool from "./tools/document_generation.tool";
import semantic_identification_tool from "./tools/semantic_identification.tool";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI();

async function main() {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `
      You are an agent that helps users to generate documents.
      
      The process is as follows:

      1. The user provides the initial query.
      1.2 If there is no enough information to continue, the agent must ask for it.
      2. Query the knowledge base to retrieve a document (Document Retrieval Agent).
      3. The output of the document retrieval agent is used to identify the structure of the document (Semantic Identification Agent).
      3.1 If the document is not found, the agent must ask for a specific information.
      3.2 If the document is found, the agent must display to the user the semantic structure of the document.
      4. Ask the user for the semantic information of the document.
      5. The output of the semantic identification agent is used to generate a document (Document Generation Agent).
      5.1 If any information is missing, the agent must ask for it.
      `,
    },
    {
      role: "system",
      content: "Do not use any markdown stylish. e.g. #, **, etc. Use plain text style.",
    },
  ];

  // clear the stdout, as console.clear but with the stdout
  process.stdout.write("\x1Bc");
  process.stdout.write("> ");

  process.stdin.setEncoding("utf8");
  process.stdin.on("readable", async () => {
    let chunk: any;

    while ((chunk = process.stdin.read()) !== null) {
      messages.push({
        role: "user",
        content: chunk.trim(),
      });

      const runner = openai.beta.chat.completions
        .runTools({
          model: "gpt-4-0125-preview",
          stream: true,
          tools: [document_retrieval_tool, document_generation_tool, semantic_identification_tool],
          messages,
          temperature: 0.1,
        })
        .on("functionCall", (functionCall) =>
          console.log(`\x1b[33m${functionCall.name} ${functionCall.arguments.substring(0, 200)}\x1b[0m`)
        )
        .on("content", (diff) => process.stdout.write(`\x1b[32m${diff}\x1b[0m`))
        .on("message", (message: any) => messages.push(message))
        .on("finalContent", () => process.stdout.write(`\n`))
        .on("error", (error) => process.stdout.write(`error => ${error}\n`))
        .on("end", () => process.stdout.write("\n> "))
        .on("abort", (error) => process.stdout.write(`abort => ${error}\n`))
        .on("connect", () => process.stdout.write("\n"));

      await runner.finalChatCompletion();
    }
  });
}

// dump the corpus
// require("fs").writeFileSync("store/corpus.json", JSON.stringify({}), "utf-8");

main();
