import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Variation {
  question: string;
  answer: string;
  analysis: string;
}

export interface AnalysisResult {
  originalText: string;
  knowledgePoint: string;
}

export const geminiService = {
  async analyzeError(base64Data: string, mimeType: string = "image/jpeg"): Promise<AnalysisResult> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data.split(',')[1] || base64Data
              }
            },
            {
              text: "请提取这份文档或图片中的题目文字，并判断该题目所属的知识点。输出格式为 JSON，包含 originalText 和 knowledgePoint 两个字段。"
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING, description: "提取的题目完整文字" },
            knowledgePoint: { type: Type.STRING, description: "题目的核心知识点" }
          },
          required: ["originalText", "knowledgePoint"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  },

  async generateVariations(originalText: string, knowledgePoint: string): Promise<Variation[]> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `原题：${originalText}\n知识点：${knowledgePoint}\n请基于此知识点生成3道举一反三的类似题目。要求：\n1. 题目难度与原题相当，角度略有变换。\n2. 每道题必须包含：题目文字(question)、正确答案(answer)、以及索引易错点的详细解析(analysis)。\n3. 解析中要重点说明常见错误及其原因。`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  analysis: { type: Type.STRING }
                },
                required: ["question", "answer", "analysis"]
              }
            }
          },
          required: ["variations"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"variations":[]}');
    return result.variations;
  }
};
