import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';

export interface CreateLearningInput {
  title: string;
  slug: string;
  description?: string;
  topic?: string;
}

const publicLearningSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  topic: true,
  thumbnailUrl: true,
  durationSeconds: true,
  videoId: true,
} satisfies Prisma.LearningSelect;

export class LearningRepository {
  static async create(input: CreateLearningInput, userId: number) {
    return prisma.learning.create({
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description,
        topic: input.topic,
        createdBy: { connect: { id: userId } },
      },
    });
  }

  static async listPublished() {
    return prisma.learning.findMany({
      where: {
        status: 'PUBLISHED',
        videoStatus: 'READY',
        videoId: { not: null, notIn: [''] },
      },
      select: publicLearningSelect,
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }, { id: 'desc' }],
      take: 20,
    });
  }

  static async findById(id: number) {
    return prisma.learning.findUnique({ where: { id } });
  }

  static async publishReady(id: number) {
    return prisma.learning.update({
      where: {
        id,
        AND: [{ videoStatus: 'READY', videoId: { not: null, notIn: [''] } }],
      },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }
}
