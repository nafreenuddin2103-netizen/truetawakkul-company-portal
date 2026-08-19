import { describe, it, expect } from 'vitest';
import { onboardingRouter } from './onboarding.routes.js';

interface ExpressRouteLayer {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
  };
}

describe('Onboarding Router Specification', () => {
  it('should define all 6 OpenAPI endpoints for onboarding draft engine', () => {
    expect(onboardingRouter).toBeDefined();
    const stack = onboardingRouter.stack as unknown as ExpressRouteLayer[];
    const routes = stack
      .map((layer) => ({
        path: layer.route?.path,
        methods: Object.keys(layer.route?.methods ?? {})
      }))
      .filter((r) => r.path);

    expect(routes.length).toBeGreaterThanOrEqual(6);
  });
});
