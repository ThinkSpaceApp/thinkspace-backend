import { Injectable, Logger } from "@nestjs/common";
import { InferenceClient } from "@huggingface/inference";

@Injectable()
export class Glm45Service {
  private readonly logger = new Logger(Glm45Service.name);
  private readonly client: InferenceClient;

  constructor() {
    const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "";
    this.client = new InferenceClient(HF_TOKEN);
  }

  async gerarTextoEducativo({
    systemPrompt,
    userPrompt,
    maxTokens = 300,
    temperature = 0.7,
    thinking = false,
  }: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    thinking?: boolean;
  }): Promise<string> {
    try {
      const parameters: any = {
        max_tokens: maxTokens,
        temperature,
      };
      if (thinking) {
        parameters.thinking = { type: "enabled" };
      }
      const resp = await this.client.chatCompletion({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        ...parameters,
      });
      if (resp.text) {
        return typeof resp.text === "string" ? resp.text : JSON.stringify(resp.text);
      }
      if (
        resp.choices &&
        resp.choices[0] &&
        resp.choices[0].message &&
        resp.choices[0].message.content
      ) {
        return resp.choices[0].message.content;
      }
      return "";
    } catch (error) {
      this.logger.error(
        `Erro ao gerar texto educativo com GLM-4.5: ${error instanceof Error ? error.message : String(error)}`,
      );
      return "Erro ao gerar texto com IA.";
    }
  }
}
