import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client();

interface Auth0TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

export async function getManagementApiToken(): Promise<string> {
    const clientId = process.env.AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;
    const audience = process.env.AUTH0_AUDIENCE;
    const tokenUrl = process.env.AUTH0_TOKEN_URL;

    if (!clientId || !clientSecret || !audience || !tokenUrl) {
        throw new Error('Missing Auth0 configuration. Please check .env.local');
    }

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                audience: audience,
                grant_type: 'client_credentials',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Auth0 Token Error:', errorText);
            throw new Error(`Failed to retrieve Auth0 token: ${response.statusText}`);
        }

        const data = (await response.json()) as Auth0TokenResponse;
        return data.access_token;
    } catch (error) {
        console.error('Error fetching Auth0 token:', error);
        throw error;
    }
}
