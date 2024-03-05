import RunnableFunction from "openai/lib/RunnableFunction";
import path from "path";
import fs from "fs";

type Args = {
  name: string;
  dir: string;
  data: string;
  ext: string;
};

export default {
  type: "function",
  function: {
    name: "write_document",
    description: "Write a document into the `docs` folder.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The file name of the document. Use kebab style. e.g. company or use-case",
        },
        ext: {
          type: "string",
          description: "The file extension of the document. e.g. txt, md, json, yaml, etc. Default is txt.",
        },
        dir: {
          type: "string",
          description: "The directory of the document. e.g. 'docs' or 'docs/folder' or 'docs/folder/sub-folder'",
        },
        data: {
          type: "string",
          description: "The data content in the document.",
        },
      },
      required: ["name", "ext", "dir", "data"],
    },
    function: async ({ name, dir, data, ext }: Args) => {
      dir = path.join(process.cwd(), dir);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
          recursive: true,
        });
      }

      const file = path.format({
        dir,
        name,
        ext,
      });

      fs.writeFileSync(file, data, "utf8");

      return {
        name,
        dir,
        data,
      };
    },
    parse: JSON.parse,
  },
} as RunnableFunction.RunnableToolFunctionWithParse<Args>;
