import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
    let message = "", context: Record<string, unknown> = {};

    try {
        const body = await request.json();
        message = body.message;
        context = body.context;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { text: "System Error: Gemini API Key is missing. Please check .env.local." },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construct System Prompt with Context
        const systemPrompt = `
You are 'Gemini Guide', an intelligent AI assistant for the 'SlugRoute' navigation app at UC Santa Cruz.
Your goal is to help users navigate, find friends, and check weather conditions.

CURRENT APP CONTEXT:
- Weather: ${context.temp}°F, ${context.condition}
- Active Tab: ${context.activeTab}
- User Location: Campus (implied)

CAPABILITIES:
You can control the app by including specific "Action Tags" at the end of your response.
- If the user asks to see the weather: reply helpfully, then end with [ACTION: NAVIGATE_WEATHER]
- If the user asks to see friends/buddies: reply helpfully, then end with [ACTION: NAVIGATE_FRIENDS]
- If the user asks about activities or community: reply helpfully, then end with [ACTION: NAVIGATE_COMMUNITY]
- If the user asks to plan a route or go to map: reply helpfully, then end with [ACTION: NAVIGATE_MAP]

RULES:
- Keep answers concise (under 2 sentences) as the user is likely mobile.
- Be friendly, helpful, and "Slug-themed" (energetic, nature-loving).
- Do NOT hallucinate features not in the app.
        `.trim();

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am Gemini Guide, ready to assist on SlugRoute." }],
                },
            ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });

    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error("Gemini Chat Error:", error);

        // FALLBACK: Try OpenAI if Gemini fails (Quota or specific error)
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log("Attempting OpenAI Fallback...");
                const { OpenAI } = await import("openai");
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                const completion = await openai.chat.completions.create({
                    messages: [
                        {
                            role: "system", content: `
You are 'Gemini Guide', an intelligent AI assistant for the 'SlugRoute' navigation app at UC Santa Cruz.
Your goal is to help users navigate, find friends, and check weather conditions.

CURRENT APP CONTEXT:
- Weather: ${context.temp}°F, ${context.condition}
- Active Tab: ${context.activeTab}
- User Location: Campus (implied)

CAPABILITIES:
You can control the app by including specific "Action Tags" at the end of your response.
- If the user asks to see the weather: reply helpfully, then end with [ACTION: NAVIGATE_WEATHER]
- If the user asks to see friends/buddies: reply helpfully, then end with [ACTION: NAVIGATE_FRIENDS]
- If the user asks about activities or community: reply helpfully, then end with [ACTION: NAVIGATE_COMMUNITY]
- If the user asks to plan a route or go to map: reply helpfully, then end with [ACTION: NAVIGATE_MAP]

RULES:
- Keep answers concise (under 2 sentences) as the user is likely mobile.
- Be friendly, helpful, and "Slug-themed" (energetic, nature-loving).
- Do NOT hallucinate features not in the app.
- Even though you are powered by OpenAI right now, you MUST identifying yourself as 'Gemini Guide'.
                        `.trim()
                        },
                        { role: "user", content: message }
                    ],
                    model: "gpt-3.5-turbo",
                });

                const text = completion.choices[0].message.content || "I'm lost in the fog.";
                return NextResponse.json({ text });

            } catch (openaiError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error("OpenAI Fallback Error:", openaiError);
                if (openaiError?.status === 429) {
                    return NextResponse.json(
                        { text: "My brain is double-tired! Both Gemini and OpenAI quotas are exhausted. Please try again later." },
                        { status: 429 }
                    );
                }
            }
        }

        // Handle Quota Exceeded
        if (error.status === 429 || error.message?.includes("429") || error.message?.includes("Quota exceeded")) {
            return NextResponse.json(
                { text: "My brain is a bit tired (Quota Exceeded). Please wait a minute and try again!" },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { text: "Sorry, I'm having trouble connecting to the stars right now. Please try again." },
            { status: 500 }
        );
    }
}
