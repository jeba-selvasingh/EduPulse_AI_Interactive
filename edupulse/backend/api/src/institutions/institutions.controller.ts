import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InstitutionId } from '../tenancy/institution-id.decorator';
import { InstitutionScopeGuard } from '../tenancy/institution-scope.guard';
import { institutionDetailSchema, institutionListSchema } from './institutions.schema';
import { InstitutionsService } from './institutions.service';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  /** Public — login institution picker (FR-1) */
  @Get()
  async list() {
    const data = await this.institutions.listPublic();
    return institutionListSchema.parse({ data });
  }

  /** Scoped — JWT institution_id or X-Institution-Id must match :id (AD-9) */
  @Get(':id')
  @UseGuards(JwtAuthGuard, InstitutionScopeGuard)
  async getById(@Param('id') id: string, @InstitutionId() institutionId: string) {
    return institutionDetailSchema.parse(await this.institutions.getById(institutionId ?? id));
  }
}
