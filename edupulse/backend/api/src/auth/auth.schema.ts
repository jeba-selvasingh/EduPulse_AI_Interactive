import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  institutionId: z.string().uuid(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer'),
  user: z.object({
    sub: z.string(),
    email: z.string().email(),
    name: z.string(),
    institutionId: z.string().uuid(),
    roles: z.array(z.string()),
  }),
});

export const meResponseSchema = loginResponseSchema.shape.user;

export const authConfigResponseSchema = z.object({
  keycloakUrl: z.string().url(),
  realm: z.string(),
  clientId: z.string(),
  redirectUri: z.string(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
