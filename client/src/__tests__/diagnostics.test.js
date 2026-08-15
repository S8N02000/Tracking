import { describe, it, expect } from 'vitest';
import router from '../router/index.js';

describe('Diagnostics Route Test', () => {
  it('should have /diagnostics route defined in router', () => {
    const route = router.getRoutes().find(r => r.path === '/diagnostics');
    expect(route).toBeDefined();
    expect(route.name).toBe('diagnostics');
  });
});
