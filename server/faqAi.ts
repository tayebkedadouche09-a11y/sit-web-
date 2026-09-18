import { invokeLLM } from "./_core/llm";

const FAQ_SCHEMA = {
  name: "product_faq",
  strict: true,
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            question: { type: "string", minLength: 10, maxLength: 180 },
            answer: { type: "string", minLength: 30, maxLength: 700 },
          },
          required: ["question", "answer"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
} as const;

type ProductFaqInput = {
  name: string;
  tagline: string;
  description: string;
  category: string;
  price: string;
  currency: string;
  requirements?: string | null;
  included?: string | null;
  license?: string | null;
  techStack: string[];
};

type GeneratedFaq = { items: Array<{ question: string; answer: string }> };

function toText(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === "string") return content;
  return content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
}

export async function generateProductFaq(input: ProductFaqInput): Promise<string> {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: "You write concise, accurate product FAQs for a premium digital website marketplace. Use only the supplied facts. Never invent integrations, guarantees, customer results, live demos, delivery dates, or payment status. Return 4 to 8 useful question-answer pairs in the requested JSON schema. Write in English because the NUMI storefront is English-language.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Generate a product FAQ that helps a qualified buyer decide whether this website system fits their launch.",
          product: input,
          style: "clear, specific, premium, low-hype; answer practical questions about fit, included assets, customization, technical requirements, license, delivery, and support without promising anything not stated",
        }),
      },
    ],
    maxTokens: 3500,
    responseFormat: { type: "json_schema", json_schema: FAQ_SCHEMA },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("The FAQ generator returned an empty response.");
  let parsed: GeneratedFaq;
  try {
    parsed = JSON.parse(toText(content)) as GeneratedFaq;
  } catch {
    throw new Error("The FAQ generator returned an invalid structured response.");
  }
  if (!Array.isArray(parsed.items) || parsed.items.length < 4) {
    throw new Error("The FAQ generator returned too few usable answers.");
  }
  return parsed.items.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n");
}
