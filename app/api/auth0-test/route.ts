
import { NextResponse } from 'next/server';
import { getManagementApiToken } from '@/lib/auth0';

export async function GET() {
    try {
        const token = await getManagementApiToken();

        // Return a masked version of the token for verification
        const maskedToken = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;

        return NextResponse.json({
            success: true,
            message: 'Successfully retrieved Auth0 Management API token',
            tokenPreview: maskedToken
        });
    } catch (error) {
        console.error('API Verification Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to retrieve token' },
            { status: 500 }
        );
    }
}
