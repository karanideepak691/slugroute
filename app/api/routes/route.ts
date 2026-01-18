import { NextResponse } from 'next/server';

// UCSC DEMO ROUTES (Science Hill -> Stevenson)
// Mocking the geometry (lat/lons) for the demo.
const ROUTES = [
    {
        id: 'fastest',
        name: 'Fastest (Steep)',
        type: 'fastest',
        distance: 0.8,
        time: 12,
        effort: 8.5, // High effort due to hills
        scenic_score: 5,
        windExposure: 'High', // Exposed on ridge
        color: '#3b82f6', // blue
        path: [ // Simplified generic path
            [36.9997, -122.0620], // Science Hill
            [36.9980, -122.0600],
            [36.9960, -122.0550], // Stevenson
        ]
    },
    {
        id: 'easiest',
        name: 'Easiest (Wind Sheltered)',
        type: 'easiest',
        distance: 1.1,
        time: 14, // Slightly longer
        effort: 4.0, // Much lower effort!
        scenic_score: 7,
        windExposure: 'Low', // Protected by trees
        color: '#22c55e', // green
        path: [
            [36.9997, -122.0620],
            [36.9990, -122.0640], // Detour through trees
            [36.9970, -122.0630],
            [36.9960, -122.0590],
            [36.9960, -122.0550],
        ]
    },
    {
        id: 'scenic',
        name: 'Scenic (Redwood Loop)',
        type: 'scenic',
        distance: 1.4,
        time: 18,
        effort: 5.5,
        scenic_score: 10,
        windExposure: 'Medium',
        color: '#a855f7', // purple
        path: [
            [36.9997, -122.0620],
            [37.0010, -122.0610], // Up into Pogonip
            [37.0000, -122.0580],
            [36.9980, -122.0550],
            [36.9960, -122.0550],
        ]
    }
];

export async function GET() {
    // In a real app, this would take start/end points and run A* with wind weights.
    // For the Hackathon Demo, we return these pre-calculated options.
    return NextResponse.json(ROUTES);
}
