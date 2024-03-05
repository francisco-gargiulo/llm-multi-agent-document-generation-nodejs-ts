import RunnableFunction from "openai/lib/RunnableFunction";
import fs from "fs";

type Args = {};

export default {
  type: "function",
  function: {
    name: "get_index",
    description: "Get the index of the `docs` folder. It returns a list with all the files in the `docs` folder.",
    parameters: {},
    function: async ({}: Args) => {
      const index: string[] = [];

      // This function will load the documents from the `docs` folder.
      function walk(path: string) {
        const contents = fs.readdirSync(path);

        for (const content of contents) {
          const route = `${path}/${content}`;

          if (fs.statSync(route).isDirectory()) {
            walk(route);
          }

          index.push(route);
        }
      }

      walk("./docs");

      return index.join("\n");
    },
    parse: JSON.parse,
  },
} as RunnableFunction.RunnableToolFunctionWithParse<Args>;
