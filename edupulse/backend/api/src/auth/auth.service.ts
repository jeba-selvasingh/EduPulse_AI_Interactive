import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LogAction } from '../observability/log-action.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { KeycloakService } from './keycloak.service';
import type { LoginRequest } from './auth.schema';
import { loginResponseSchema } from './auth.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly keycloak: KeycloakService,
    private readonly actionLogger: StructuredLoggerService,
  ) {}

  getPublicConfig() {
    return {
      keycloakUrl: this.keycloak.keycloakUrl,
      realm: this.keycloak.realm,
      clientId: this.keycloak.clientId,
      redirectUri: 'edupulse://auth/callback',
    };
  }

  async login(body: LoginRequest) {
    const started = Date.now();

    try {
      const { user, tokens } = await this.keycloak.loginWithPassword(
        body.email,
        body.password,
        body.institutionId,
      );

      this.actionLogger.logAction({
        action: LogAction.AuthLogin,
        durationMs: Date.now() - started,
        outcome: 'success',
        institutionId: user.institutionId,
        userId: user.sub,
        metadata: { method: 'password', roles: user.roles },
      });

      return loginResponseSchema.parse({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
        user,
      });
    } catch {
      this.actionLogger.logAction({
        action: LogAction.AuthLogin,
        durationMs: Date.now() - started,
        outcome: 'failure',
        institutionId: body.institutionId,
        metadata: { method: 'password', reason: 'invalid_credentials' },
      });

      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password. Please try again.',
      });
    }
  }

  async exchangeSsoCode(code: string, redirectUri: string, codeVerifier: string) {
    const started = Date.now();

    try {
      const { user, tokens } = await this.keycloak.exchangeAuthorizationCode(
        code,
        redirectUri,
        codeVerifier,
      );

      this.actionLogger.logAction({
        action: LogAction.AuthSsoCallback,
        durationMs: Date.now() - started,
        outcome: 'success',
        institutionId: user.institutionId,
        userId: user.sub,
        metadata: { method: 'sso' },
      });

      return loginResponseSchema.parse({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
        user,
      });
    } catch {
      this.actionLogger.logAction({
        action: LogAction.AuthSsoCallback,
        durationMs: Date.now() - started,
        outcome: 'failure',
        metadata: { method: 'sso', reason: 'exchange_failed' },
      });

      throw new UnauthorizedException({
        code: 'SSO_FAILED',
        message: 'College SSO sign-in failed. Please try again.',
      });
    }
  }
}
