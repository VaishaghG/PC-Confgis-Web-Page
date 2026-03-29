jest.mock('../../middleware/requireAuth', () => jest.fn());

const requireAuth = require('../../middleware/requireAuth');
const requireAdmin = require('../../middleware/adminAuth');

function createResponse() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 403 when the authenticated user is not an admin', async () => {
    requireAuth.mockImplementation(async (req, res, next) => {
      req.user = { _id: 'user-123', role: 'user' };
      await next();
    });

    const req = {};
    const res = createResponse();
    const next = jest.fn();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ message: 'Admins only' });
    expect(next).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('calls next when the authenticated user is an admin', async () => {
    requireAuth.mockImplementation(async (req, res, next) => {
      req.user = { _id: 'admin-123', role: 'admin' };
      await next();
    });

    const req = {};
    const res = createResponse();
    const next = jest.fn();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();

    consoleSpy.mockRestore();
  });
});
