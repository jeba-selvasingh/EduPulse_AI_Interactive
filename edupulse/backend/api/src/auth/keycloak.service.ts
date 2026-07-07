import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, TokenPair } from './auth.types';

const PES_INSTITUTION_ID = '00000000-0000-4000-8000-000000000001';

const DEV_USERS: Array<{
  email: string;
  password: string;
  name: string;
  institutionId: string;
  roles: string[];
  sub: string;
}> = [
  {
    sub: 'dev-faculty-001',
    email: 'faculty@pes.edu',
    password: 'pilot123',
    name: 'Prof. Rao',
    institutionId: PES_INSTITUTION_ID,
    roles: ['faculty'],
  },
  {
    sub: 'dev-student-001',
    email: 'student@pes.edu',
    password: 'pilot123',
    name: 'Chetan R',
    institutionId: PES_INSTITUTION_ID,
    roles: ['student'],
  },
  {
    sub: 'dev-principal-001',
    email: 'principal@pes.edu',
    password: 'pilot123',
    name: 'Dr. Principal',
    institutionId: PES_INSTITUTION_ID,
    roles: ['principal'],
  },
  {
    sub: 'dev-tpo-001',
    email: 'tpo@pes.edu',
    password: 'pilot123',
    name: 'TPO Lead',
    institutionId: PES_INSTITUTION_ID,
    roles: ['tpo'],
  },
  {
    sub: 'dev-moderator-001',
    email: 'moderator@pes.edu',
    password: 'pilot123',
    name: 'Dr. Mehta',
    institutionId: PES_INSTITUTION_ID,
    roles: ['moderator'],
  },
  {
    sub: 'dev-admin-001',
    email: 'admin@pes.edu',
    password: 'pilot123',
    name: 'IT Admin',
    institutionId: PES_INSTITUTION_ID,
    roles: ['admin'],
  },
];

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly config: ConfigService) {}

  get keycloakUrl(): string {
    return this.config.get<string>('KEYCLOAK_URL', 'http://localhost:8080').replace(/\/$/, '');
  }

  get realm(): string {
    return this.config.get<string>('KEYCLOAK_REALM', 'edupulse');
  }

  get clientId(): string {
    return this.config.get<string>('KEYCLOAK_CLIENT_ID', 'edupulse-mobile');
  }

  get devAuthEnabled(): boolean {
    return this.config.get<string>('AUTH_DEV_MODE', 'true') === 'true';
  }

  private get tokenUrl(): string {
    return `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
  }

  private get jwksUrl(): string {
    return `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
  }

  private getJwks() {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(this.jwksUrl));
    }
    return this.jwks;
  }

  async loginWithPassword(
    email: string,
    password: string,
    institutionId: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    try {
      return await this.keycloakPasswordGrant(email, password, institutionId);
    } catch (error) {
      if (!this.devAuthEnabled) {
        throw error;
      }

      this.logger.warn(
        `Keycloak login failed, using dev auth: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return this.devPasswordLogin(email, password, institutionId);
    }
  }

  async exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Keycloak code exchange failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };

    const user = await this.verifyAccessToken(payload.access_token);

    return {
      user,
      tokens: {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresIn: payload.expires_in,
        tokenType: payload.token_type,
      },
    };
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer: `${this.keycloakUrl}/realms/${this.realm}`,
      });

      return this.mapPayload(payload);
    } catch (error) {
      if (!this.devAuthEnabled) {
        throw error;
      }

      return this.verifyDevToken(token);
    }
  }

  private async keycloakPasswordGrant(
    email: string,
    password: string,
    institutionId: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      username: email,
      password,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Keycloak password grant failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
    };

    const user = await jwtVerify(payload.access_token, this.getJwks(), {
      issuer: `${this.keycloakUrl}/realms/${this.realm}`,
    }).then((r) => this.mapPayload(r.payload));

    if (user.institutionId && user.institutionId !== institutionId) {
      throw new Error('Institution mismatch');
    }

    if (!user.institutionId) {
      user.institutionId = institutionId;
    }

    return {
      user,
      tokens: {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresIn: payload.expires_in,
        tokenType: payload.token_type,
      },
    };
  }

  private mapPayload(payload: Record<string, unknown>): AuthUser {
    const roles = this.extractRoles(payload);
    const institutionId =
      (payload.institution_id as string | undefined) ??
      (payload.institutionId as string | undefined) ??
      '';

    return {
      sub: String(payload.sub ?? ''),
      email: String(payload.email ?? payload.preferred_username ?? ''),
      name: String(payload.name ?? payload.preferred_username ?? 'User'),
      institutionId,
      roles,
    };
  }

  private extractRoles(payload: Record<string, unknown>): string[] {
    const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
    const realmRoles = realmAccess?.roles ?? [];
    const direct = payload.roles;

    if (Array.isArray(direct)) {
      return [...new Set([...realmRoles, ...direct.map(String)])];
    }

    return realmRoles;
  }

  private async devPasswordLogin(
    email: string,
    password: string,
    institutionId: string,
  ): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const account = DEV_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );

    if (!account || account.institutionId !== institutionId) {
      throw new Error('Invalid credentials');
    }

    const user: AuthUser = {
      sub: account.sub,
      email: account.email,
      name: account.name,
      institutionId: account.institutionId,
      roles: account.roles,
    };

    const accessToken = await this.signDevToken(user);

    return {
      user,
      tokens: {
        accessToken,
        expiresIn: 28_800,
        tokenType: 'Bearer',
      },
    };
  }

  private async signDevToken(user: AuthUser): Promise<string> {
    const secret = new TextEncoder().encode(
      this.config.get<string>('AUTH_DEV_SECRET', 'edupulse-dev-secret-change-me'),
    );

    return new SignJWT({
      email: user.email,
      name: user.name,
      institution_id: user.institutionId,
      roles: user.roles,
      realm_access: { roles: user.roles },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.sub)
      .setIssuer('edupulse-dev')
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret);
  }

  private async verifyDevToken(token: string): Promise<AuthUser> {
    const secret = new TextEncoder().encode(
      this.config.get<string>('AUTH_DEV_SECRET', 'edupulse-dev-secret-change-me'),
    );

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'edupulse-dev',
    });

    return this.mapPayload(payload as Record<string, unknown>);
  }
}
