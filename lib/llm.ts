export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionParams {
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: "json_object" | "text" };
  signal?: AbortSignal;
}

export interface ChatCompletionResult {
  text: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ChatCompletionStreamChunk {
  text: string;
  done: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
}

export interface LLMProvider {
  readonly name: string;
  chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>;
  chatCompletionStream(params: ChatCompletionParams): AsyncGenerator<ChatCompletionStreamChunk>;
  createEmbedding(text: string): Promise<EmbeddingResult>;
  createEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
}

import { openaiProvider } from "./llm-providers/openai";
import { minimaxProvider } from "./llm-providers/minimax";

const providers: Record<string, LLMProvider> = {
  openai: openaiProvider,
  minimax: minimaxProvider,
};

let _chatProvider: LLMProvider | null = null;
let _embeddingProvider: LLMProvider | null = null;

function createProvider(name: string): LLMProvider {
  const provider = providers[name.toLowerCase()];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}. Supported: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}

export function getChatProvider(): LLMProvider {
  if (!_chatProvider) {
    const providerName = process.env.LLM_PROVIDER || "openai";
    _chatProvider = createProvider(providerName);
  }
  return _chatProvider;
}

export function getEmbeddingProvider(): LLMProvider {
  if (!_embeddingProvider) {
    const providerName = process.env.EMBEDDING_PROVIDER || process.env.LLM_PROVIDER || "openai";
    _embeddingProvider = createProvider(providerName);
  }
  return _embeddingProvider;
}

/** Reset cached providers (useful in tests). */
export function resetLLMProviders(): void {
  _chatProvider = null;
  _embeddingProvider = null;
}
