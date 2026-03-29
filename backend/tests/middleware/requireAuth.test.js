jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../../models/User');
const requireAuth = require('../../middleware/requireAuth');

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

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when no user id is present', async () => {
    const req = { session: {} };
    const res = createResponse();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ message: 'Not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches the user and calls next when the user exists', async () => {
    const user = { _id: 'user-123', role: 'user' };
    User.findById.mockResolvedValue(user);

    const req = { session: { userId: 'user-123' }, user: null };
    const res = createResponse();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(User.findById).toHaveBeenCalledWith('user-123');
    expect(req.user).toBe(user);
    expect(req.session.userId).toBe('user-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('clears session and returns 401 when the user record no longer exists', async () => {
    User.findById.mockResolvedValue(null);

    const req = { session: { userId: 'missing-user' }, user: { _id: 'missing-user' } };
    const res = createResponse();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(req.session.userId).toBeUndefined();
    expect(req.user).toBeNull();
    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ message: 'Not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 500 when the lookup throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    User.findById.mockRejectedValue(new Error('db down'));

    const req = { session: { userId: 'user-123' } };
    const res = createResponse();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ message: 'Server error' });
    expect(next).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
