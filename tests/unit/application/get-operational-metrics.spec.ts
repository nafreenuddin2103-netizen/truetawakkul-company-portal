import { describe, it, expect } from 'vitest';
import { GetOperationalMetricsUseCase } from '../../../src/application/use-cases/operations/get-operational-metrics.usecase.js';

describe('GetOperationalMetricsUseCase', () => {
  it('should instantiate GetOperationalMetricsUseCase', () => {
    const useCase = new GetOperationalMetricsUseCase();
    expect(useCase).toBeDefined();
  });
});
