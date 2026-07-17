const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Circle, Member, Expense, ExpenseSplit, Settlement, ActivityLog } = require('../../src/models');
const config = require('../../src/config');
const { settlementService } = require('../../src/services');
const { SETTLEMENT_STATUS } = require('../../src/constants');

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
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  const user = await User.create({
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'TestPass123!',
  });
  userId = user._id.toString();
  accessToken = generateToken(user);
  user2 = null;
  circleId = null;
});

afterEach(async () => {
  await Settlement.deleteMany({});
  await ActivityLog.deleteMany({});
  await ExpenseSplit.deleteMany({});
  await Expense.deleteMany({});
  await Member.deleteMany({});
  await Circle.deleteMany({});
  await User.deleteMany({});
});

const createCircle = async () => {
  const res = await agent
    .post('/api/v1/circles')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Finance Circle', currency: 'USD' })
    .expect(201);
  circleId = res.body.data._id;
  return res.body.data;
};

const addUser2 = async () => {
  const u = await User.create({
    name: 'User 2',
    email: 'user2@example.com',
    password: 'TestPass123!',
  });
  await Member.create({ user: u._id, circle: circleId, role: 'member' });
  user2 = u;
  return u;
};

const createExpense = async (payerId, amount, splits) => {
  const res = await agent
    .post('/api/v1/expenses')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      circleId,
      title: 'Expense',
      amount,
      splitMethod: 'exact',
      splits,
    })
    .expect(201);
  return res.body.data;
};

const getUser2Token = () => generateToken(user2);

describe('Settlement Engine', () => {
  describe('Simple Debts', () => {
    beforeEach(async () => {
      await createCircle();
      await addUser2();
    });

    it('should calculate balances correctly for a simple debt', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      const member1 = await Member.findOne({ user: userId, circle: circleId }).lean();
      const member2 = await Member.findOne({ user: user2._id, circle: circleId }).lean();

      const balances = await settlementService.calculateNetBalances(circleId);
      const payer = balances.find((b) => b.userId === member1._id.toString());
      const other = balances.find((b) => b.userId === member2._id.toString());

      expect(payer).toBeDefined();
      expect(payer.netBalance).toBeCloseTo(100, 1);
      expect(other).toBeDefined();
      expect(other.netBalance).toBeCloseTo(-100, 1);
    });

    it('should generate optimal settlement for a single debt', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      expect(result.suggestedSettlements).toHaveLength(1);
      expect(result.suggestedSettlements[0].amount).toBeCloseTo(100, 1);
    });

    it('should settle debts across three members', async () => {
      const user3 = await User.create({
        name: 'User 3',
        email: 'user3@example.com',
        password: 'TestPass123!',
      });
      await Member.create({ user: user3._id, circle: circleId, role: 'member' });

      await createExpense(userId, 90, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 45 },
        { user: user3._id.toString(), amount: 45 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      expect(result.suggestedSettlements.filter((s) => s.amount > 0).length).toBeGreaterThan(0);
    });
  });

  describe('Complex Debt Graphs', () => {
    let user2;

    beforeEach(async () => {
      await createCircle();
      user2 = await addUser2();
    });

    it('should minimize number of transactions', async () => {
      const user3 = await User.create({
        name: 'User 3',
        email: 'user3@example.com',
        password: 'TestPass123!',
      });
      await Member.create({ user: user3._id, circle: circleId, role: 'member' });

      await createExpense(userId, 300, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 150 },
        { user: user3._id.toString(), amount: 150 },
      ]);

      await createExpense(userId, 100, [
        { user: userId, amount: 100 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      const nonZero = result.suggestedSettlements.filter((s) => s.amount > 0);
      expect(nonZero.length).toBeGreaterThan(0);
      expect(nonZero.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Partial Settlements', () => {
    beforeEach(async () => {
      await createCircle();
      await addUser2();
    });

    it('should process partial settlement and close when fully paid', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      const suggested = result.suggestedSettlements[0];
      const toUserId = suggested.to._id.toString();
      const fromUser2Token = getUser2Token();

      const res = await supertest.agent(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${fromUser2Token}`)
        .send({
          circleId,
          to: toUserId,
          amount: suggested.amount,
        })
        .expect(201);
      const settlementId = res.body.data._id;

      const partial = await settlementService.partialSettlement(settlementId, user2._id.toString(), 40);
      expect(partial.remainingAmount).toBeCloseTo(60, 1);
      expect(partial.status).not.toBe(SETTLEMENT_STATUS.COMPLETED);

      const completed = await settlementService.partialSettlement(settlementId, user2._id.toString(), 60);
      expect(completed.status).toBe(SETTLEMENT_STATUS.COMPLETED);
    });
  });

  describe('Cancellation', () => {
    beforeEach(async () => {
      await createCircle();
      await addUser2();
    });

    it('should cancel a pending settlement', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      const suggested = result.suggestedSettlements[0];
      const toUserId = suggested.to._id.toString();
      const fromUser2Token = getUser2Token();

      const res = await supertest.agent(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${fromUser2Token}`)
        .send({
          circleId,
          to: toUserId,
          amount: suggested.amount,
        })
        .expect(201);
      const settlementId = res.body.data._id;

      const cancelled = await settlementService.cancelSettlement(settlementId, user2._id.toString());
      expect(cancelled.status).toBe(SETTLEMENT_STATUS.CANCELLED);
    });

    it('should allow the receiver to cancel a pending settlement', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      const suggested = result.suggestedSettlements[0];
      const toUserId = suggested.to._id.toString();
      const fromUser2Token = getUser2Token();

      const res = await supertest.agent(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${fromUser2Token}`)
        .send({
          circleId,
          to: toUserId,
          amount: suggested.amount,
        })
        .expect(201);
      const settlementId = res.body.data._id;

      const cancelled = await settlementService.cancelSettlement(settlementId, userId);
      expect(cancelled.status).toBe(SETTLEMENT_STATUS.CANCELLED);
    });
  });

  describe('Business Rules', () => {
    it('should reject settlements in archived circles', async () => {
      await createCircle();
      await addUser2();

      await agent
        .patch(`/api/v1/circles/${circleId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ archive: true })
        .expect(200);

      await expect(
        settlementService.getSuggestedSettlements(circleId)
      ).rejects.toThrow('Archived circles cannot create new settlements');
    });

    it('should reject settlements in deleted circles', async () => {
      await createCircle();
      await addUser2();

      const circle = await Circle.findById(circleId);
      circle.isDeleted = true;
      await circle.save();

      await expect(
        settlementService.calculateNetBalances(circleId)
      ).rejects.toThrow('Deleted circles reject settlement operations');
    });
  });

  describe('Recalculation', () => {
    beforeEach(async () => {
      await createCircle();
      await addUser2();
    });

    it('should regenerate settlements after recalculation', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      await settlementService.recalculateSettlements(circleId);

      const settlements = await Settlement.find({ circle: circleId, status: SETTLEMENT_STATUS.PENDING });
      expect(settlements.length).toBeGreaterThan(0);
    });
  });

  describe('API Endpoints', () => {
    beforeEach(async () => {
      await createCircle();
      await addUser2();
    });

    it('GET /settlements/circles/:circleId/settlements should list settlements', async () => {
      const res = await agent
        .get(`/api/v1/settlements/circles/${circleId}/settlements`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('GET /settlements/:id should retrieve a settlement', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      const suggested = result.suggestedSettlements[0];
      const toUserId = suggested.to._id.toString();
      const fromUser2Token = getUser2Token();

      const createRes = await supertest.agent(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${fromUser2Token}`)
        .send({
          circleId,
          to: toUserId,
          amount: suggested.amount,
        })
        .expect(201);
      const settlementId = createRes.body.data._id;

      const res = await agent
        .get(`/api/v1/settlements/${settlementId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data._id).toBe(settlementId);
    });

    it('POST /settlements/:id/confirm should confirm a settlement', async () => {
      await createExpense(userId, 100, [
        { user: userId, amount: 0 },
        { user: user2._id.toString(), amount: 100 },
      ]);

      const result = await settlementService.getSuggestedSettlements(circleId);
      const suggested = result.suggestedSettlements[0];
      const toUserId = suggested.to._id.toString();
      const fromUser2Token = getUser2Token();

      const createRes = await supertest.agent(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${fromUser2Token}`)
        .send({
          circleId,
          to: toUserId,
          amount: suggested.amount,
        })
        .expect(201);
      const settlementId = createRes.body.data._id;

      await agent
        .post(`/api/v1/settlements/${settlementId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
