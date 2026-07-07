import { Injectable } from '@nestjs/common';
import type { QuestionPaper } from './paper-craft.schema';

@Injectable()
export class PaperCraftStoreService {
  private readonly papers = new Map<string, QuestionPaper>();

  save(paper: QuestionPaper): QuestionPaper {
    this.papers.set(paper.id, paper);
    return paper;
  }

  getById(id: string): QuestionPaper | undefined {
    return this.papers.get(id);
  }
}
