import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../utils/apiError';
import { LearningRepository } from './learning.repository';

export class LearningService {
  static async publish(id: number) {
    const learning = await LearningRepository.findById(id);
    if (!learning) {
      throw new NotFoundError('Learning not found');
    }

    if (learning.videoStatus !== 'READY' || !learning.videoId) {
      throw new ConflictError('A learning can only be published when its video is ready');
    }

    try {
      return await LearningRepository.publishReady(id);
    } catch (error) {
      // The guarded update also checks readiness if it changed after the read.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictError('The learning changed before publication. Please try again.');
      }
      throw error;
    }
  }
}
