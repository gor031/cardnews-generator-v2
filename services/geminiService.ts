
import { GoogleGenAI, Type } from "@google/genai";
import { CardNewsData, Slide } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const convertTextToCardNews = async (text: string): Promise<CardNewsData> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 텍스트를 카드뉴스 형식의 JSON 데이터로 변환해주세요.
텍스트: ${text}

JSON 구조:
{
  "topic": "주제",
  "targetAudience": "타겟",
  "tone": "어조",
  "hashtags": ["태그1", "태그2"],
  "slides": [
    {
      "pageNumber": 1,
      "header": "표지 제목(짧고 굵게) **강조**",
      "body": "" 
    },
    {
      "pageNumber": 2,
      "header": "소제목(핵심만)",
      "body": "본문은 최대 2줄.\\n줄바꿈을 적극 활용.\\n**핵심** 단어 강조."
    }
  ]
}

규칙:
1. 반드시 JSON 코드만 출력하세요.
2. 핵심 단어는 **강조** 표시를 포함하세요.
3. 슬라이드는 6~10장 내외로 구성하세요.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          tone: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pageNumber: { type: Type.INTEGER },
                header: { type: Type.STRING },
                body: { type: Type.STRING }
              },
              required: ["pageNumber", "header", "body"]
            }
          }
        },
        required: ["topic", "targetAudience", "tone", "hashtags", "slides"]
      }
    }
  });

  const data = JSON.parse(response.text);
  
  // Basic Validation and Style Assignment
  const validatedSlides: Slide[] = data.slides.map((slide: any, index: number) => {
    const isCover = (slide.pageNumber || index + 1) === 1;
    return {
      pageNumber: slide.pageNumber || index + 1,
      header: slide.header || "",
      body: slide.body || "",
      headerStyle: {
        align: isCover ? 'center' : 'left',
        fontSize: isCover ? 'text-5xl' : 'text-3xl',
        color: ''
      },
      bodyStyle: {
        align: 'left',
        fontSize: 'text-2xl',
        color: ''
      }
    };
  });

  return {
    ...data,
    slides: validatedSlides
  };
};

// Helper to clean Markdown code blocks (```json ... ```)
const cleanJsonString = (text: string): string => {
  let cleanText = text || "{}";
  
  // Remove markdown code blocks if present
  cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
  
  const jsonStart = cleanText.indexOf('{');
  const jsonArrayStart = cleanText.indexOf('[');
  
  // Detect if it's an object or array and slice accordingly
  if (jsonStart !== -1 && (jsonArrayStart === -1 || jsonStart < jsonArrayStart)) {
    const jsonEnd = cleanText.lastIndexOf('}');
    if (jsonEnd !== -1) {
      return cleanText.substring(jsonStart, jsonEnd + 1);
    }
  }
  
  return cleanText;
};

export const parseCardNewsJson = (input: string): CardNewsData => {
  try {
    const cleaned = cleanJsonString(input);
    const data = JSON.parse(cleaned);

    // Basic Validation
    if (!data.slides || !Array.isArray(data.slides)) {
      throw new Error("내용을 찾을 수 없습니다.");
    }

    if (data.slides.length === 0) {
      throw new Error("내용이 비어있습니다.");
    }

    // Ensure required fields exist
    const validatedSlides: Slide[] = data.slides.map((slide: any, index: number) => {
      const isCover = (slide.pageNumber || index + 1) === 1;
      
      return {
        pageNumber: slide.pageNumber || index + 1,
        header: slide.header || "",
        body: slide.body || "",
        // Default Styles
        headerStyle: {
          align: isCover ? 'center' : 'left',
          fontSize: isCover ? 'text-5xl' : 'text-3xl',
          color: '' // Empty string means use theme default
        },
        bodyStyle: {
          align: 'left',
          fontSize: 'text-2xl',
          color: ''
        }
      };
    });

    return {
      topic: data.topic || "제목 없음",
      targetAudience: data.targetAudience || "전체",
      tone: data.tone || "기본",
      hashtags: data.hashtags || [],
      slides: validatedSlides,
      themeIndex: data.themeIndex // Preserve if exists, or App.tsx will assign random
    };
  } catch (error) {
    console.error("Parse Error:", error);
    // User-friendly error message
    throw new Error("변환에 실패했습니다. AI가 써준 내용을 '처음부터 끝까지' 정확히 복사해서 붙여넣었는지 확인해주세요.");
  }
};
