import RunnableFunction from "openai/lib/RunnableFunction";
import OpenAI from "openai";
import { ChatCompletionStreamingRunner } from "openai/lib/ChatCompletionStreamingRunner";

const openai = new OpenAI();

type Args = {
  template: string;
  context: string;
};

export default {
  type: "function",
  function: {
    name: "document_generation_tool",
    description: "Generate a document based on a semantic template. You must response with the entire document.",
    parameters: {
      type: "object",
      properties: {
        template: {
          type: "string",
          description: "The semantic template to be used to generate the document. e.g. 'Title: ...'",
        },
        context: {
          type: "string",
          description: "The context of the document to be generated.",
        },
      },
      required: ["template", "context"],
    },
    function: async ({ template, context }: Args, runner: ChatCompletionStreamingRunner) => {
      // The cumulative messages are the messages that the user and the assistant exchanged.
      // We will use this to generate the document.
      const cumulative_messages = runner.messages.filter(({ content, role }) => content && role === "assistant");

      const response = await openai.chat.completions.create({
        model: "gpt-4-0125-preview",
        messages: [
          ...cumulative_messages,
          {
            role: "system",
            content:
              "You are an agent that has the purpose of generating content to fill a document semantic template.",
          },
          {
            role: "system",
            content: `The following is an example response:

            Abstract: 
              This document outlines a proposed standard for creating dummy data within RFC documents. The aim is to establish a uniform approach to generating and incorporating dummy data, which will aid in the clarity and testing of RFCs.
            
            Title: 
              Standard for Dummy Data in RFC Documents

            Status of This Memo: 
              This document is not an Internet Standards Track specification; it is published for informational purposes.
            
            Table of Contents:
            
              1. Introduction
              2. Requirements Language
              3. Dummy Requirement
                3.1. Dummy Data Format
                3.2. Dummy Data Generation
              4. IANA Considerations
              5. Security Considerations
              6. References
              7. Acknowledgements
              8. Author's Address

            ...[REST OF THE DOCUMENT]`,
          },
          {
            role: "user",
            content: `
            The following is a document semantic template:

            ${template}

            The following is the context of the document:

            ${context}
            
            Write the a new document based on the template and the context.

            DOCUMENT PREVIEW:
            `,
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
