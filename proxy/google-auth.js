import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();

export async function verifyGoogleToken(credential, audience, client = googleClient) {
    if (typeof credential !== 'string' || !credential || !audience) return null;

    try {
        const ticket = await client.verifyIdToken({ idToken: credential, audience });
        const payload = ticket.getPayload();
        if (!payload ||
            typeof payload.sub !== 'string' || !payload.sub ||
            typeof payload.email !== 'string' ||
            payload.email_verified !== true ||
            typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() ||
            !payload.email.toLowerCase().endsWith('@amplitude.com') ||
            payload.hd !== 'amplitude.com') {
            return null;
        }
        return payload;
    } catch {
        // The library verifies Google's signature, issuer, audience, and expiration.
        return null;
    }
}
