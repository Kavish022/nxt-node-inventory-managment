import { Learning, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningRepository } from '../modules/learning/learning.repository';
import { LearningService } from '../modules/learning/learning.service';
import { ConflictError, NotFoundError } from '../utils/apiError';

vi.mock('../modules/learning/learning.repository', () => ({
  LearningRepository: {
    findById: vi.fn(),
    publishReady: vi.fn(),
  },
}));

const readyLearning: Learning = {
  id: 1,
  title: 'Getting started',
  slug: 'getting-started',
  description: null,
  topic: null,
  thumbnailUrl: null,
  durationSeconds: null,
  videoId: 'provider-video-id',
  videoStatus: 'READY',
  status: 'DRAFT',
  isFeatured: false,
  sortOrder: 0,
  createdById: null,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Learning publication', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each(['PENDING_UPLOAD', 'UPLOADING', 'PROCESSING', 'FAILED'] as const)(
    'rejects publication while the video is %s',
    async (videoStatus) => {
      vi.mocked(LearningRepository.findById).mockResolvedValue({ ...readyLearning, videoStatus });

      await expect(LearningService.publish(1)).rejects.toBeInstanceOf(ConflictError);
      expect(LearningRepository.publishReady).not.toHaveBeenCalled();
    }
  );

  it.each([null, ''])('rejects a ready video with an empty provider identifier (%s)', async (videoId) => {
    vi.mocked(LearningRepository.findById).mockResolvedValue({ ...readyLearning, videoId });

    await expect(LearningService.publish(1)).rejects.toBeInstanceOf(ConflictError);
    expect(LearningRepository.publishReady).not.toHaveBeenCalled();
  });

  it('reports an unknown learning', async () => {
    vi.mocked(LearningRepository.findById).mockResolvedValue(null);

    await expect(LearningService.publish(1)).rejects.toBeInstanceOf(NotFoundError);
    expect(LearningRepository.publishReady).not.toHaveBeenCalled();
  });

  it('publishes a ready video with a provider identifier', async () => {
    const published = { ...readyLearning, status: 'PUBLISHED' as const, publishedAt: new Date() };
    vi.mocked(LearningRepository.findById).mockResolvedValue(readyLearning);
    vi.mocked(LearningRepository.publishReady).mockResolvedValue(published);

    await expect(LearningService.publish(1)).resolves.toEqual(published);
  });

  it('handles readiness changing before the guarded database update', async () => {
    vi.mocked(LearningRepository.findById).mockResolvedValue(readyLearning);
    vi.mocked(LearningRepository.publishReady).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record no longer matches', {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client,
      })
    );

    await expect(LearningService.publish(1)).rejects.toBeInstanceOf(ConflictError);
  });
});
