export interface Route {
    id: string;
    name: string;
    type: string;
    distance: number;
    time: number;
    effort: number;
    windExposure: string;
    scenic_score: number;
    color: string;
    path: number[][];
}

export interface Buddy {
    id: string;
    name: string;
    locationName: string;
    coords: [number, number];
    status: string;
}

export interface Activity {
    title: string;
    icon: string;
    coords: [number, number];
    desc: string;
}

export interface WindData {
    speed: number;
    direction: number;
    temp: number;
    condition: string;
    forecast?: ForecastDay[];
}

export interface ForecastDay {
    day: string;
    icon: string;
    condition: string;
    temp: number;
}

export interface Trail {
    id: string;
    // Add other trail properties as needed based on API response
    [key: string]: unknown;
}
