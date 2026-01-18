import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!process.env.ELEVENLABS_API_KEY) {
            console.warn('Missing ELEVENLABS_API_KEY');
            return NextResponse.json({ audioUrl: '/demo_voice_alert.mp3', mock: true });
        }

        const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text || "Wind warning on your route.",
                model_id: "eleven_turbo_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API Error:', errorText);
            // Fallback to mock on error
            return NextResponse.json({ audioUrl: '/demo_voice_alert.mp3', mock: true });
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
            },
        });

    } catch (error) {
        console.error('Voice Generation Error:', error);
        return NextResponse.json({ audioUrl: '/demo_voice_alert.mp3', mock: true });
    }
}
