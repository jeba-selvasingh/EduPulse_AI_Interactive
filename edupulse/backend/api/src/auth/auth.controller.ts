import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { authConfigResponseSchema, loginRequestSchema, meResponseSchema } from './auth.schema';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './auth.types';

const ssoCallbackSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().min(1),
  codeVerifier: z.string().min(43),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('config')
  getConfig() {
    return authConfigResponseSchema.parse(this.auth.getPublicConfig());
  }

  @Post('login')
  async login(@Body() body: unknown) {
    return this.auth.login(loginRequestSchema.parse(body));
  }

  @Post('sso/callback')
  async ssoCallback(@Body() body: unknown) {
    const parsed = ssoCallbackSchema.parse(body);
    return this.auth.exchangeSsoCode(parsed.code, parsed.redirectUri, parsed.codeVerifier);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return meResponseSchema.parse(user);
  }
}
