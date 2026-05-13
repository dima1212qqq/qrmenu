import OpenAI from "openai";
import type {
  ChatCompletionParams,
  ChatCompletionResult,
  ChatCompletionStreamChunk,
  EmbeddingResult,
  LLMProvider,
} from "@/lib/llm";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

const DEFAULT_CHAT_MODEL = process.env.LLM_CHAT_MODEL || "gpt-4o-mini";
const DEFAULT_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

export const openaiProvider: LLMProvider = {
  name: "openai",

  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const response = await client.chat.completions.create(
      {
        model: params.model || DEFAULT_CHAT_MODEL,
        messages: params.messages as any,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        response_format: params.response_format,
      },
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
        response_format: params.response_format,
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
    const response = await client.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: text,
    });
    return { embedding: response.data[0].embedding };
  },

  async createEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await client.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: texts,
    });
    return response.data.map((item) => ({ embedding: item.embedding }));
  },
};
