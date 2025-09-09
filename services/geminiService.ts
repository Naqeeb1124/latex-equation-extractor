
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function getLatexFromImage(base64ImageData: string, mimeType: string): Promise<string> {
  try {
    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: 'Extract the LaTeX code for the equation in this image. Only return the raw LaTeX code itself, without any surrounding text, explanations, or markdown formatting like ```latex ... ```.'
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });
    
    const latex = response.text.trim();
    if (!latex) {
      throw new Error("Gemini returned an empty response. The equation might not be clear in the image.");
    }

    return latex;

  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    // Add more specific error messages based on the error type if needed
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("Invalid API Key. Please check your configuration.");
    }
    throw new Error("Failed to generate LaTeX from the image. Please try again with a clearer image.");
  }
}
