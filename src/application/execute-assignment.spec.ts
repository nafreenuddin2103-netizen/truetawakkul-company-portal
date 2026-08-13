import { describe, it, expect, vi } from 'vitest';
import { ExecuteAssignmentUseCase } from './use-cases/assignment/execute-assignment.usecase.js';
import { AssignmentType } from '../domain/enums/assignment-type.enum.js';
import { NotFoundError } from '../shared/errors/app-error.js';

describe('ExecuteAssignmentUseCase', () => {
  it('should throw NotFoundError if masjid does not exist', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      withTransaction: vi.fn()
    };

    const useCase = new ExecuteAssignmentUseCase(mockDb as any);

    await expect(
      useCase.execute({
        masjidId: 'msj-nonexistent',
        userId: 'usr-1',
        assignmentType: AssignmentType.PRIMARY_ADMIN,
        assignedBy: 'usr-admin'
      })
    ).rejects.toThrow(NotFoundError);
  });
});
