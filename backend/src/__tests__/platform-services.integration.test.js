const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const {
  User,
  Circle,
  Member,
  Expense,
  ExpenseSplit,
  Settlement,
  ActivityLog,
  Notification,
} = require('../../src/models');
const config = require('../../src/config');
const { SPLIT_METHODS } = require('../../src/constants');

let mongod;
let accessToken;
let userId;
let circleId;
let user2;

const generateToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, name: user.name },
    config.jwt.accessSecret,
    { expiresIn: '15m' }
  );
};

const agent = supertest.agent(app);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 120000);

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Circle.deleteMany({}),
    Member.deleteMany({}),
    Expense.deleteMany({}),
    ExpenseSplit.deleteMany({}),
    Settlement.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  const user = await User.create({
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'TestPass123!',
  });
  userId = user._id.toString();
  accessToken = generateToken(user);

  const circle = await Circle.create({ name: 'Test Circle', owner: userId, currency: 'USD' });
  await Member.create({ user: userId, circle: circle._id, role: 'owner' });
  circleId = circle._id.toString();

  const u2 = await User.create({
    name: 'User 2',
    email: 'user2@example.com',
    password: 'TestPass123!',
  });
  await Member.create({ user: u2._id, circle: circleId, role: 'member' });
  user2 = u2;
}, 30000);

afterEach(async () => {
  await Notification.deleteMany({});
  await ActivityLog.deleteMany({});
  await Settlement.deleteMany({});
  await ExpenseSplit.deleteMany({});
  await Expense.deleteMany({});
  await Member.deleteMany({});
  await Circle.deleteMany({});
  await User.deleteMany({});
});

describe('Search Endpoints', () => {
  it('should search expenses', async () => {
    await Expense.create({
      circle: circleId,
      paidBy: userId,
      title: 'Groceries',
      amount: 50,
      splitMethod: SPLIT_METHODS.EQUAL,
      splits: [{ user: userId, amount: 25 }, { user: user2._id, amount: 25 }],
    });

    const res = await agent
      .get('/api/v1/search?q=groceries&type=expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should search circles', async () => {
    const res = await agent
      .get('/api/v1/search?q=Test&type=circles')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should search members', async () => {
    const res = await agent
      .get('/api/v1/search?q=User&type=members')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('Notification Endpoints', () => {
  beforeEach(async () => {
    await Notification.create({
      user: userId,
      type: 'expense_added',
      title: 'Test Notification',
      message: 'This is a test notification',
    });
  });

  it('should get user notifications', async () => {
    const res = await agent
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get unread count', async () => {
    const res = await agent
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.meta.unreadCount).toBeDefined();
  });

  it('should mark notification as read', async () => {
    const notification = await Notification.findOne({ user: userId });
    const res = await agent
      .patch(`/api/v1/notifications/${notification._id}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should mark all as read', async () => {
    const res = await agent
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should delete notification', async () => {
    const notification = await Notification.findOne({ user: userId });
    const res = await agent
      .delete(`/api/v1/notifications/${notification._id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get notification preferences', async () => {
    const res = await agent
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should update notification preferences', async () => {
    const res = await agent
      .patch('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: false, push: true })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('Activity Timeline Endpoints', () => {
  beforeEach(async () => {
    await ActivityLog.create({
      circle: circleId,
      user: userId,
      type: 'expense_created',
      description: 'Test activity',
    });
  });

  it('should get circle activities', async () => {
    const res = await agent
      .get(`/api/v1/activities/circles/${circleId}/activities`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get user activities', async () => {
    const res = await agent
      .get('/api/v1/activities/me/activities')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Analytics Endpoints', () => {
  beforeEach(async () => {
    await Expense.create({
      circle: circleId,
      paidBy: userId,
      title: 'Analytics Test Expense',
      amount: 100,
      splitMethod: SPLIT_METHODS.EQUAL,
      splits: [{ user: userId, amount: 50 }, { user: user2._id, amount: 50 }],
    });
  });

  it('should get monthly spending', async () => {
    const res = await agent
      .get('/api/v1/analytics/spending/monthly')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get weekly spending', async () => {
    const res = await agent
      .get('/api/v1/analytics/spending/weekly')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get daily spending', async () => {
    const res = await agent
      .get('/api/v1/analytics/spending/daily')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get category distribution', async () => {
    const res = await agent
      .get('/api/v1/analytics/categories/distribution')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get member balances', async () => {
    const res = await agent
      .get(`/api/v1/analytics/members/balances/${circleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get circle comparison', async () => {
    const res = await agent
      .get('/api/v1/analytics/circles/comparison')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get top expenses', async () => {
    const res = await agent
      .get('/api/v1/analytics/top/expenses')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get top payers', async () => {
    const res = await agent
      .get('/api/v1/analytics/top/payers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get top receivers', async () => {
    const res = await agent
      .get('/api/v1/analytics/top/receivers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get settlement statistics', async () => {
    const res = await agent
      .get(`/api/v1/analytics/settlements/statistics/${circleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get cash flow', async () => {
    const res = await agent
      .get('/api/v1/analytics/cash-flow')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get dashboard summary', async () => {
    const res = await agent
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('Reports Endpoints', () => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  it('should get monthly report', async () => {
    const res = await agent
      .get(`/api/v1/reports/monthly?year=${year}&month=${month}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should get circle report', async () => {
    const res = await agent
      .get(`/api/v1/reports/circles/${circleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should export report as JSON', async () => {
    const res = await agent
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ format: 'json', report: { type: 'expense', expenses: [] } })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('Dashboard Endpoints', () => {
  it('should get dashboard summary', async () => {
    const res = await agent
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCircles).toBeDefined();
  });
});

describe('Profile & Preferences Endpoints', () => {
  it('should get preferences', async () => {
    const res = await agent
      .get('/api/v1/auth/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should update preferences', async () => {
    const res = await agent
      .patch('/api/v1/auth/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        'preferences.currency': 'EUR',
        'preferences.language': 'fr',
        'preferences.timezone': 'Europe/Paris',
        'preferences.theme': 'dark',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('Auth Profile Endpoints', () => {
  it('should get profile', async () => {
    const res = await agent
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should update profile', async () => {
    const res = await agent
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
