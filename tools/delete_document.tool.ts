import fs from "fs";
import RunnableFunction from "openai/lib/RunnableFunction";
import path from "path";

type Args = {
  file: string;
  dir: string;
};

export default {
  type: "function",
  function: {
    name: "delete_document",
    description: "Deletes a document from the `docs` folder.",
    parameters: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "The file name to delete the document. Use kebab style. e.g. company.txt or use-case.txt",
        },
        dir: {
          type: "string",
          description: "The dir to delete the document. e.g. 'docs/' or 'docs/folder' or 'docs/folder/sub-folder'",
        },
      },
      required: ["file", "dir", "text"],
    },
    function: async ({ file, dir }: Args) => {
      dir = path.join(process.cwd(), dir);

      // if dir does not start with docs, then it is not allowed.
      if (!dir.startsWith("docs")) {
        return "The dir is not allowed.";
      }

      // check if the dir exists.
      if (!fs.existsSync(dir)) {
        return "The dir does not exist.";
      }

      // delete the document to the file system int the docs folder.
      fs.unlinkSync(path.join(dir, file));

      return "The document has been deleted.";
    },
    parse: JSON.parse,
  },
} as RunnableFunction.RunnableToolFunctionWithParse<Args>;
