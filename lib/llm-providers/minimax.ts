import OpenAI from "openai";
import type {
  ChatCompletionParams,
  ChatCompletionResult,
  ChatCompletionStreamChunk,
  EmbeddingResult,
  LLMProvider,
} from "@/lib/llm";

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1",
});

// Fallback to OpenAI for embeddings since MiniMax does not provide embedding API
const fallbackClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const DEFAULT_CHAT_MODEL = process.env.LLM_CHAT_MODEL || "MiniMax-M2.7";
const DEFAULT_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

export const minimaxProvider: LLMProvider = {
  name: "minimax",

  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const body: any = {
      model: params.model || DEFAULT_CHAT_MODEL,
      messages: params.messages as any,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      tool_choice: "none", // Prevent tool calls
    };
    // MiniMax does not support response_format the same way OpenAI does;
    // rely on the system prompt for JSON-only output instead.
    if (params.response_format && params.response_format.type === "json_object") {
      // No-op: MiniMax ignores this field; system prompt enforces JSON.
    }

    const response = await client.chat.completions.create(
      body,
      params.signal ? { signal: params.signal } : undefined
    );

    const text = response.choices[0]?.message?.content ?? "";
    const usage = response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined;

    return { text, usage };
  },

  async *chatCompletionStream(params: ChatCompletionParams): AsyncGenerator<ChatCompletionStreamChunk> {
    const stream = await client.chat.completions.create(
      {
        model: params.model || DEFAULT_CHAT_MODEL,
        messages: params.messages as any,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        tool_choice: "none",
        stream: true as const,
      },
      params.signal ? { signal: params.signal } : undefined
    );

    for await (const chunk of stream as AsyncIterable<{
      choices: { delta: { content?: string } }[];
    }>) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      yield { text, done: false };
    }
    yield { text: "", done: true };
  },

  async createEmbedding(text: string): Promise<EmbeddingResult> {
    if (!fallbackClient) {
      throw new Error(
        "MiniMax does not support embeddings. Set OPENAI_API_KEY for embedding fallback."
      );
    }
    const response = await fallbackClient.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: text,
    });
    return { embedding: response.data[0].embedding };
  },

  async createEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!fallbackClient) {
      throw new Error(
        "MiniMax does not support embeddings. Set OPENAI_API_KEY for embedding fallback."
      );
    }
    const response = await fallbackClient.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: texts,
    });
    return response.data.map((item) => ({ embedding: item.embedding }));
  },
};
