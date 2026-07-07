import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { InstitutionDetail, InstitutionSummary } from './institutions.schema';

const PILOT_INSTITUTIONS: Array<{ id: string; name: string; code: string }> = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'PES University', code: 'pes' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'RV College of Engineering', code: 'rvce' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'MS Ramaiah Institute of Technology', code: 'msrit' },
];

@Injectable()
export class InstitutionsService implements OnModuleInit {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.institution.count();
      if (count === 0) {
        await this.prisma.institution.createMany({
          data: PILOT_INSTITUTIONS.map(({ id, name, code }) => ({ id, name, code })),
        });
        this.logger.log(`Seeded ${PILOT_INSTITUTIONS.length} pilot institutions`);
      }
    } catch (error) {
      this.logger.warn(
        `Institution seed skipped — database unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async listPublic(): Promise<InstitutionSummary[]> {
    try {
      const rows = await this.prisma.institution.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      });

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      this.logger.warn(
        `Institution list falling back to pilot data: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return PILOT_INSTITUTIONS.map(({ id, name, code }) => ({ id, name, code }));
  }

  async getById(id: string): Promise<InstitutionDetail> {
    try {
      const row = await this.prisma.institution.findUnique({ where: { id } });

      if (row) {
        return {
          id: row.id,
          name: row.name,
          code: row.code,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      this.logger.warn(
        `Institution lookup falling back to pilot data: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    const pilot = PILOT_INSTITUTIONS.find((item) => item.id === id);
    if (!pilot) {
      throw new NotFoundException({
        code: 'INSTITUTION_NOT_FOUND',
        message: 'Institution not found',
      });
    }

    const now = new Date().toISOString();
    return {
      ...pilot,
      createdAt: now,
      updatedAt: now,
    };
  }
}
