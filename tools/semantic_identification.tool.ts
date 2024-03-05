import RunnableFunction from "openai/lib/RunnableFunction";
import OpenAI from "openai";
import fs from "fs";
import { ChatCompletionStreamingRunner } from "openai/lib/ChatCompletionStreamingRunner";

const openai = new OpenAI();

type Args = {
  document: string;
};

export default {
  type: "function",
  function: {
    name: "semantic_identification_tool",
    description: "Agent tool that identify the structure of a document.",
    parameters: {
      type: "object",
      properties: {
        document: {
          type: "string",
          description: "The sigle document to be analyzed. e.g. 'docs/README.md'",
        },
      },
      required: ["document"],
    },
    function: async function ({ document }: Args, runner: ChatCompletionStreamingRunner) {
      const cumulative_messages = runner.messages.filter(({ content, role }) => content && role === "assistant");

      const response = await openai.chat.completions.create({
        model: "gpt-4-0125-preview",
        messages: [
          ...cumulative_messages,
          {
            role: "system",
            content: "You are an agent helping to identify a semantic structure of a document.",
          },
          {
            role: "system",
            content: `You must response with a semantic template. e.g.:
            First-page header                      * [Required]
            Title                                    [Required]
            Abstract                                 [Required]
            RFC Editor or Stream Note              * [Upon request]
            Status of This Memo                    * [Required]
            Copyright Notice                       * [Required]
            Table of Contents                      * [Required]
            Body of the Memo                         [Required]
              1.  Introduction                       [Required]
              2.  Requirements Language (RFC 2119)
              3.  ...
                  [MAIN BODY OF THE TEXT]
              6.  ...
              7.  IANA Considerations                [Required in I-D]
              8.  Internationalization Considerations
              9.  Security Considerations            [Required]
              10.  References
              10.1.  Normative References
              10.2.  Informative References
              Appendix A.
              Appendix B.
            Acknowledgements
            Contributors
            Author's Address                         [Required]`,
          },
          {
            role: "user",
            content: `Identify a semantic template in document:\n\n${fs.readFileSync(document, "utf-8")}`,
          },
        ],
        response_format: {
          type: "text",
        },
        temperature: 0,
        max_tokens: 4096,
      });

      return response.choices[0].message.content;
    },
    parse: JSON.parse,
  },
} as RunnableFunction.RunnableToolFunctionWithParse<Args>;
