import { ChatCompletionStreamingRunner } from "openai/lib/ChatCompletionStreamingRunner";
import RunnableFunction from "openai/lib/RunnableFunction";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";

const openai = new OpenAI();

type Document = {
  text: string;
  embedding?: number[];
  similarity?: number;
  hash?: string;
};

// The corpus is a JSON file that stores the documents and their embeddings.
// You won't want this on a real project, but for the sake of this example, it's fine.
const CORPUS = "store/corpus.json";

type Args = {
  query: string;
};

export default {
  type: "function",
  function: {
    name: "document_retrieval_tool",
    description:
      "Document retrieval tool that query relevant information, templates or examples from the `docs` folder.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The query to search for. e.g. 'RFC Document Template' or 'Use Case Example' or 'List all the use cases'",
        },
      },
      required: ["query"],
    },
    function: async ({ query }: Args) => {
      // This function will load the documents from the `docs` folder.
      async function load(dir: string) {
        const docs: Record<string, Document> = {};

        function walk(path: string) {
          const contents = fs.readdirSync(path);

          for (const content of contents) {
            const route = `${path}/${content}`;

            const stat = fs.statSync(route);

            if (stat.isDirectory()) {
              walk(route);

              continue;
            }

            const text = fs.readFileSync(route, "utf-8");

            docs[route] = {
              text: `File: ${route}\n${text}\n`,
            };
          }
        }

        walk(dir);

        return docs;
      }

      // This function will index the documents and store the embeddings in the corpus.
      async function index(docs: Record<string, Document>) {
        const store: any = JSON.parse(fs.readFileSync(CORPUS, "utf-8"));

        for (const file in docs) {
          const doc = docs[file];
          const stored_doc = store[file];

          // if the file in the corpus and the hash is the same, keep the old one, if not, update it
          const hash = crypto.createHash("sha256").update(doc.text).digest("hex");

          if (hash === stored_doc?.hash) {
            Object.assign(doc, stored_doc);

            continue;
          }

          doc.hash = hash;

          doc.embedding = await openai.embeddings
            .create({
              model: "text-embedding-3-large",
              input: doc.text,
            })
            .then((response) => response.data[0].embedding);
        }

        return docs;
      }

      // This function will store the documents in the corpus.
      async function store(docs: Record<string, Document>) {
        const corpus = JSON.parse(fs.readFileSync(CORPUS, "utf-8"));

        const docs_hash = crypto.createHash("sha256").update(JSON.stringify(docs)).digest("hex");
        const corpus_hash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

        if (docs_hash === corpus_hash) {
          return corpus;
        }

        Object.assign(corpus, docs);

        fs.writeFileSync(CORPUS, JSON.stringify(corpus), "utf-8");

        return docs;
      }

      // This function will retrieve the documents that are relevant to the query.
      async function retrieve(store: Record<string, Document>): Promise<any> {
        const queryEmbedding = await openai.embeddings
          .create({
            model: "text-embedding-3-large",
            input: query,
          })
          .then((response) => response.data[0].embedding);

        let documents: Document[] = [];

        for (const file in store) {
          const { text, embedding } = store[file];

          if (!embedding) {
            continue;
          }

          const dotProduct = queryEmbedding.reduce((acc, curr, idx) => acc + curr * embedding[idx], 0);

          // Computes the magnitude of each vector.
          const magA = Math.sqrt(queryEmbedding.reduce((acc, curr) => acc + curr ** 2, 0));
          const magB = Math.sqrt(embedding.reduce((acc, curr) => acc + curr ** 2, 0));

          // Returns the cosine similarity.
          const similarity = dotProduct / (magA * magB);

          documents.push({
            text,
            similarity,
          });
        }

        // Sorts the documents by similarity and retrieves the most relevant.
        const relevant_documents = documents
          .sort((a, b) => {
            if (!a.similarity || !b.similarity) {
              throw new Error("Similarity not found for document.");
            }

            return b.similarity - a.similarity;
          })
          .slice(0, 5) as Document[];

        // Ensure relevance
        const response = await openai.chat.completions.create({
          model: "gpt-4-0125-preview",
          messages: [
            {
              role: "system",
              content: `The following is the index of the existing documents in the knowledge base: \n${Object.keys(
                relevant_documents
              ).join("\n")}`,
            },
            {
              role: "system",
              content:
                "You will evaluate a set of documents to answer the query." +
                " If none of the documents are relevant, please request for a specific information.",
            },
            {
              role: "system",
              content: `json response:
              {
                success: boolean, // if the query was answered successfully
                message: string, // if the query was not answered successfully
                docs: string[] // the full path of the document that answered the query
              }`,
            },
            {
              role: "user",
              content: `Ensure that this query:\n${query}\n is relevant to the following documents:\n${relevant_documents
                .map((doc) => doc.text)
                .join("\n====\n")}. Remove the irrelevant documents.`,
            },
          ],
          response_format: {
            type: "json_object",
          },
          temperature: 0,
          max_tokens: 4096,
        });

        const responseJSON = JSON.parse(response.choices[0].message.content as string);

        if (responseJSON.success) {
          return `The following documents were found to answer the query:\n\n${responseJSON.docs.join("\n")}`;
        }

        return responseJSON.message || "No relevant documents found.";
      }

      return load("docs").then(index).then(store).then(retrieve);
    },
    parse: JSON.parse,
  },
} as RunnableFunction.RunnableToolFunctionWithParse<Args>;
