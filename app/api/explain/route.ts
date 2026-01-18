import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { routeName, advantages, windSpeed } = await request.json();

        // MOCK RESPONSE for Hackathon speed/reliability
        // If no key is provided, return a canned response suited for the demo scenario.
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                explanation: `I recommend the **${routeName}** route. Although it is slightly longer, it shields you from the ${windSpeed}mph headwinds on the ridge, effectively reducing your cycling effort by 15%. It also passes the Redwood Grove, which is beautiful right now.`
            });
        }

        // OPENAI QUOTA EXCEEDED FALLBACK
        // Since the key has no credits, we simulate the AI insight with smart templates.

        let insight = "";
        const exposure = advantages || "Unknown";
        const speed = parseFloat(windSpeed || "0");

        if (speed > 5 && (exposure === 'High' || exposure === 'Medium')) {
            insight = `Caution: Winds are currently ${speed} m/s. The **${routeName}** route is exposed, so expect significant resistance on the ridge.`;
        } else if (speed > 5 && exposure === 'Low') {
            insight = `Good choice! With winds at ${speed} m/s, strictly following the **${routeName}** path will keep you sheltered by the tree line, saving ~15% energy.`;
        } else if (speed <= 5) {
            insight = `Conditions are mild (${speed} m/s). The **${routeName}** route offers the best detailed views of the bay today without wind chill concerns.`;
        } else {
            insight = `I recommend the **${routeName}** route. It optimizes for your energy by avoiding the crosswinds near Science Hill.`;
        }

        return NextResponse.json({
            explanation: insight
        });

    } catch (err) {
        console.error("Explanation Error:", err);
        return NextResponse.json({ explanation: "The route was chosen to minimize wind resistance based on current conditions." });
    }
}
