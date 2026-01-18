import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat') || '36.9914'; // Default to UCSC Science Hill
    const lon = searchParams.get('lon') || '-122.0609';

    const clientId = process.env.WINDBORNE_CLIENT_ID;
    const apiKey = process.env.WINDBORNE_API_KEY;

    // MOCK DATA for UCSC Demo
    // Simulates a strong NW wind (common in Santa Cruz)
    const mockWindData = {
        speed_ms: 8.5, // ~19mph, breezy!
        direction_deg: 315, // NW
        gust_ms: 12.0,
        source: 'MOCK_UCSC_DATA'
    };

    if (!clientId || !apiKey) {
        console.warn('WindBorne keys missing, using mock UCSC wind data.');
        return NextResponse.json(mockWindData);
    }

    try {
        // Attempt real API call using Basic Auth
        // User reports WindBorne uses Basic Auth (User:Client ID, Pass:API Key)
        const authString = Buffer.from(`${clientId}:${apiKey}`).toString('base64');

        const response = await fetch(
            `https://api.windbornesystems.com/forecasts/v1/wm-4/point_forecast.json?coordinates=${lat},${lon}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`,
                },
            }
        );

        if (!response.ok) {
            console.warn(`WindBorne API error (${response.status}). Using mock data.`);
            return NextResponse.json(mockWindData);
        }

        const data = await response.json();

        // Parse Forecast (Next 5 Days / 5 Points)
        // The API returns time steps. We'll take every 6th point (assuming ~hourly or 3-hourly) to simulate daily
        // or just take the first 5 available points for the "Forecast"
        const rawPoints = data.forecasts?.[0] || [];

        // Helper to process a point
        const processPoint = (p: any, i: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const u = p.wind_u_10m ?? 0;
            const v = p.wind_v_10m ?? 0;
            const temp = p.temperature_2m ?? 0;
            const precip = p.precipitation ?? 0;
            const speed = Math.sqrt(u * u + v * v);

            let condition = 'Cloudy';
            if (precip > 0.1) condition = 'Rainy';
            else if (speed > 8) condition = 'Windy';
            else if (temp > 20) condition = 'Sunny';
            else if (temp < 12) condition = 'Foggy';
            else if (temp > 15) condition = 'Partly Cloudy';

            return {
                day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(new Date().getDay() + i) % 7],
                temp: temp,
                condition: condition,
                icon: condition === 'Sunny' ? '☀️' : condition === 'Rainy' ? '🌧️' : '☁️'
            };
        };

        const forecast = rawPoints.slice(0, 5).map((p: any, i: number) => processPoint(p, i)); // eslint-disable-line @typescript-eslint/no-explicit-any

        // Current (first point)
        const current = rawPoints[0] || {};
        const u = current.wind_u_10m ?? 0;
        const v = current.wind_v_10m ?? 0;
        const dir = (Math.atan2(v, u) * 180) / Math.PI;
        const metDir = ((dir + 360) % 360 + 180) % 360;

        return NextResponse.json({
            speed: parseFloat(Math.sqrt(u * u + v * v).toFixed(1)),
            direction: Math.round(metDir),
            temp: current.temperature_2m ?? 15,
            condition: processPoint(current, 0).condition,
            forecast: forecast.length > 0 ? forecast : [
                { day: 'Mon', temp: 15, condition: 'Sunny', icon: '☀️' },
                { day: 'Tue', temp: 16, condition: 'Cloudy', icon: '☁️' },
                { day: 'Wed', temp: 14, condition: 'Rainy', icon: '🌧️' },
                { day: 'Thu', temp: 18, condition: 'Sunny', icon: '☀️' },
                { day: 'Fri', temp: 17, condition: 'Partly Cloudy', icon: '⛅' }
            ]
        });

    } catch (error) {
        console.error('Wind API Error', error);
        // Fallback Mock with Forecast
        return NextResponse.json({
            speed: 8.5,
            direction: 315,
            temp: 15,
            condition: 'Cloudy',
            forecast: [
                { day: 'Mon', temp: 15, condition: 'Sunny', icon: '☀️' },
                { day: 'Tue', temp: 16, condition: 'Cloudy', icon: '☁️' },
                { day: 'Wed', temp: 14, condition: 'Rainy', icon: '🌧️' },
                { day: 'Thu', temp: 18, condition: 'Sunny', icon: '☀️' },
                { day: 'Fri', temp: 17, condition: 'Partly Cloudy', icon: '⛅' }
            ]
        });
    }
}
