import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

@Injectable()
export class SyllabusStorageService {
  private readonly root: string;

  constructor(private readonly config: ConfigService) {
    this.root =
      this.config.get<string>('SYLLABUS_STORAGE_PATH') ??
      join(process.cwd(), 'uploads', 'syllabus');
  }

  getRoot(): string {
    return this.root;
  }

  buildStorageKey(
    institutionId: string,
    courseCode: string,
    academicTerm: string,
    fileName: string,
  ): string {
    const safeCourse = courseCode.toUpperCase();
    const safeTerm = academicTerm.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const safeName = fileName.replace(/[^\w.-]/g, '_');
    return join(institutionId, safeCourse, safeTerm, safeName);
  }

  async savePdf(storageKey: string, bytes: Buffer): Promise<string> {
    const absolute = join(this.root, storageKey);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);
    return storageKey;
  }
}
