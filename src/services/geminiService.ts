
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static instance: GeminiService;
  private ai: GoogleGenAI;

  private constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  async processSmartText(text: string, instruction: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Text: ${text}\n\nInstruction: ${instruction}`,
      config: {
        systemInstruction: "You are a world-class text manipulation expert. Transform the provided text according to the specific user instruction. Only return the transformed text, no explanations.",
        temperature: 0.7,
      }
    });

    return response.text || "Error processing text.";
  }
}
