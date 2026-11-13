import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import test from 'node:test';
import { OAuth2Client } from 'google-auth-library';
import { verifyGoogleToken } from './google-auth.js';

const audience = 'test-client-id.apps.googleusercontent.com';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { privateKey: otherPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const client = new OAuth2Client();
client.getFederatedSignonCertsAsync = async () => ({
    certs: { test: publicKey.export({ type: 'spki', format: 'pem' }) },
    format: 'PEM'
});

function signedToken(overrides = {}, key = privateKey) {
    const payload = {
        iss: 'https://accounts.google.com',
        aud: audience,
        sub: 'test-subject',
        email: 'test@amplitude.com',
        email_verified: true,
        hd: 'amplitude.com',
        iat: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 300,
        ...overrides
    };
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const input = `${header}.${body}`;
    const signature = createSign('RSA-SHA256').update(input).sign(key).toString('base64url');
    return `${input}.${signature}`;
}

test('accepts a correctly signed Workspace identity', async () => {
    const payload = await verifyGoogleToken(signedToken(), audience, client);
    assert.equal(payload?.sub, 'test-subject');
});

test('rejects a forged signature and unconfigured audience', async () => {
    assert.equal(await verifyGoogleToken(signedToken({}, otherPrivateKey), audience, client), null);
    assert.equal(await verifyGoogleToken(signedToken(), undefined, client), null);
});

for (const [name, claims] of [
    ['issuer', { iss: 'https://not-google.example' }],
    ['audience', { aud: 'another-client' }],
    ['expiration', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['email domain', { email: 'test@example.com' }],
    ['hosted domain', { hd: 'example.com' }],
    ['unverified email', { email_verified: false }]
]) {
    test(`rejects invalid ${name}`, async () => {
        assert.equal(await verifyGoogleToken(signedToken(claims), audience, client), null);
    });
}
