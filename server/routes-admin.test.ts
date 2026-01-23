
import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Hoisted mocks
const { mockDb, mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit, mockOffset } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockOrderBy = vi.fn();
  const mockLimit = vi.fn();
  const mockOffset = vi.fn();

  const mockDb = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    offset: mockOffset,
  };

  // Chainable mocks
  mockSelect.mockReturnValue(mockDb);
  mockFrom.mockReturnValue(mockDb);
  mockWhere.mockReturnValue(mockDb);
  mockOrderBy.mockReturnValue(mockDb);
  mockLimit.mockReturnValue(mockDb);
  mockOffset.mockReturnValue(mockDb);

  return { mockDb, mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit, mockOffset };
});

vi.mock('./db', () => ({
  db: mockDb,
}));

vi.mock('./utils/auth-helpers', () => ({
  isAdmin: () => true,
  isStaff: () => true,
}));

vi.mock('./middleware/auth', () => ({
  getUserId: () => 'mock-user-id',
}));

vi.mock('./services/supabase-storage', () => ({
  isSupabaseStorageConfigured: () => false,
  ensureBucketExists: () => Promise.resolve(),
}));

vi.mock('./services/email', () => ({
  sendInvitationEmail: () => Promise.resolve(),
}));

// Import after mocks
import { registerAdminRoutes } from './routes-admin';

describe('GET /requests', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset chainable returns to ensure they return mockDb
    mockSelect.mockReturnValue(mockDb);
    mockFrom.mockReturnValue(mockDb);
    mockWhere.mockReturnValue(mockDb);
    mockOrderBy.mockReturnValue(mockDb);
    mockLimit.mockReturnValue(mockDb);
    mockOffset.mockReturnValue(mockDb);

    // Default resolved value for the query
    // The chain usually ends with limit() or offset() or execution.
    // In our code: await query.orderBy(...).limit(...).offset(...)
    // So offset() needs to resolve.
    mockOffset.mockResolvedValue([
      { id: '1', argomento: 'Test Request' }
    ]);
    mockLimit.mockReturnValue(mockDb); // limit returns builder
    mockOrderBy.mockReturnValue(mockDb); // orderBy returns builder

    app = express();
    app.use(express.json());

    // Mock user for middleware
    app.use((req, res, next) => {
      (req as any).user = { email: 'staff@example.com', role: 'staff' };
      next();
    });

    registerAdminRoutes(app);
  });

  it('should fetch requests with default limit/offset', async () => {
    const res = await request(app).get('/api/admin/requests');

    expect(res.status).toBe(200);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockOrderBy).toHaveBeenCalled();

    // Verify default values
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(mockOffset).toHaveBeenCalledWith(0);
  });

  it('should fetch requests with custom pagination', async () => {
    const res = await request(app).get('/api/admin/requests?page=2&limit=20');

    expect(res.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(mockOffset).toHaveBeenCalledWith(20); // (2-1) * 20 = 20
  });

  it('should respect max limit', async () => {
    const res = await request(app).get('/api/admin/requests?limit=1000');

    expect(res.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith(500); // Max is 500
  });

  it('should handle invalid pagination params gracefully', async () => {
    const res = await request(app).get('/api/admin/requests?page=abc&limit=xyz');

    expect(res.status).toBe(200);
    // Should fallback to defaults
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(mockOffset).toHaveBeenCalledWith(0);
  });
});
