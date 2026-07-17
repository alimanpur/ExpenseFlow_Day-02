const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Circle, Member, Expense, ExpenseSplit, ActivityLog, Transaction, Settlement } = require('../../src/models');
const config = require('../../src/config');
const { financialEngine } = require('../../src/services');
const { SPLIT_METHODS, ACTIVITY_TYPES } = require('../../src/constants');

let mongod;
let accessToken;
let userId;
let circleId;

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
});

afterEach(async () => {
  await Transaction.deleteMany({});
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

const addMember = async (email, name, role = 'member') => {
  const user = await User.create({
    name,
    email,
    password: 'TestPass123!',
  });
  await Member.create({ user: user._id, circle: circleId, role });
  return user;
};

describe('Financial Integration', () => {
  describe('Create Expense', () => {
    beforeEach(async () => {
      await createCircle();
    });

    it('should create an equal-split expense and update balances', async () => {
      const user2 = await addMember('m2@example.com', 'Member 2');
      const user3 = await addMember('m3@example.com', 'Member 3');

      const res = await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Dinner',
          amount: 90,
          splitMethod: SPLIT_METHODS.EQUAL,
          splits: [
            { user: userId },
            { user: user2._id.toString() },
            { user: user3._id.toString() },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Dinner');
      expect(res.body.data.amount).toBe(90);
      expect(res.body.data.splits).toHaveLength(3);

      const expense = await Expense.findById(res.body.data._id).populate('splits');
      expect(expense).toBeDefined();
      expect(expense.splits).toHaveLength(3);
      expect(expense.circle.toString()).toBe(circleId);

      const splits = await ExpenseSplit.find({ expense: expense._id });
      expect(splits).toHaveLength(3);
      const splitSum = splits.reduce((s, x) => s + x.amount, 0);
      expect(splitSum).toBeCloseTo(90, 1);

      const summary = await financialEngine.getCircleSummary(circleId);
      const payerBalance = summary.memberBalances.find(b => b.userId === userId.toString());
      const others = summary.memberBalances.filter(b => b.userId !== userId.toString());
      expect(payerBalance.totalPaid).toBeCloseTo(90, 1);
      for (const m of others) {
        expect(m.totalOwed).toBeGreaterThan(0);
      }
      // In equal split, each person owes 30 (90/3)
      expect(others[0].totalOwed).toBeCloseTo(30, 1);
      expect(others[1].totalOwed).toBeCloseTo(30, 1);

      const transactions = await Transaction.find({ referenceId: expense._id, referenceModel: 'Expense' });
      expect(transactions.length).toBeGreaterThanOrEqual(1);

      const logs = await ActivityLog.find({ circle: circleId });
      expect(logs.some((l) => l.type === ACTIVITY_TYPES.EXPENSE_CREATED)).toBe(true);
    });

    it('should create a percentage-split expense', async () => {
      const user2 = await addMember('p2@example.com', 'Member 2');

      const res = await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Groceries',
          amount: 100,
          splitMethod: SPLIT_METHODS.PERCENTAGE,
          splits: [
            { user: userId, percentage: 70 },
            { user: user2._id.toString(), percentage: 30 },
          ],
        })
        .expect(201);

      expect(res.body.data.splits).toHaveLength(2);
      const amounts = res.body.data.splits.map((s) => s.amount).sort((a, b) => a - b);
      expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);
    });

    it('should create an exact-split expense', async () => {
      const user2 = await addMember('e2@example.com', 'Member 2');

      const res = await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Taxi',
          amount: 50,
          splitMethod: SPLIT_METHODS.EXACT,
          splits: [
            { user: userId, amount: 30 },
            { user: user2._id.toString(), amount: 20 },
          ],
        })
        .expect(201);

      const amounts = res.body.data.splits.map((s) => s.amount).sort((a, b) => a - b);
      expect(amounts).toEqual([20, 30]);
    });

    it('should create a shares-split expense', async () => {
      const user2 = await addMember('s2@example.com', 'Member 2');

      const res = await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Rent',
          amount: 1000,
          splitMethod: SPLIT_METHODS.SHARES,
          splits: [
            { user: userId, shares: 3 },
            { user: user2._id.toString(), shares: 1 },
          ],
        })
        .expect(201);

      const amounts = res.body.data.splits.map((s) => s.amount).sort((a, b) => a - b);
      expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 1);
    });

    it('should reject duplicate members in splits', async () => {
      await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Duplicate',
          amount: 50,
          splitMethod: SPLIT_METHODS.EQUAL,
          splits: [
            { user: userId },
            { user: userId },
          ],
        })
        .expect(400);
    });

    it('should reject percentage totals not equaling 100', async () => {
      const user2 = await addMember('pct@example.com', 'Member 2');

      await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Bad Pct',
          amount: 100,
          splitMethod: SPLIT_METHODS.PERCENTAGE,
          splits: [
            { user: userId, percentage: 60 },
            { user: user2._id.toString(), percentage: 30 },
          ],
        })
        .expect(400);
    });
  });

  describe('Update Expense', () => {
    beforeEach(async () => {
      await createCircle();
      const user2 = await addMember('up2@example.com', 'Member 2');

      await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Original',
          amount: 100,
          splitMethod: SPLIT_METHODS.EQUAL,
          splits: [
            { user: userId },
            { user: user2._id.toString() },
          ],
        })
        .expect(201);
    });

    it('should update expense title', async () => {
      const expense = await Expense.findOne({ title: 'Original', isDeleted: false });
      const res = await agent
        .patch(`/api/v1/expenses/${expense._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should persist split records on title-only update', async () => {
      const expense = await Expense.findOne({ title: 'Original', isDeleted: false });
      await agent
        .patch(`/api/v1/expenses/${expense._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Title Only' })
        .expect(200);

      const splits = await ExpenseSplit.find({ expense: expense._id });
      expect(splits).toHaveLength(2);
    });
  });

  describe('Delete Expense', () => {
    beforeEach(async () => {
      await createCircle();
      const user2 = await addMember('del2@example.com', 'Member 2');

      await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'ToDelete',
          amount: 80,
          splitMethod: SPLIT_METHODS.EQUAL,
          splits: [
            { user: userId },
            { user: user2._id.toString() },
          ],
        })
        .expect(201);
    });

    it('should soft delete expense and reverse balances', async () => {
      const expense = await Expense.findOne({ title: 'ToDelete', isDeleted: false });
      await agent
        .delete(`/api/v1/expenses/${expense._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deleted = await Expense.findById(expense._id);
      expect(deleted.isDeleted).toBe(true);

      const summary = await financialEngine.getCircleSummary(circleId);
      const memberBalance = summary.memberBalances.find(b => b.userId === userId.toString());
      expect(memberBalance.totalPaid).toBeCloseTo(0, 1);
    });
  });

  describe('Archived Circle', () => {
    it('should reject expense creation in archived circle', async () => {
      await createCircle();
      await agent
        .patch(`/api/v1/circles/${circleId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ archive: true })
        .expect(200);

      await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Blocked',
          amount: 50,
          splitMethod: SPLIT_METHODS.EQUAL,
          splits: [{ user: userId }],
        })
        .expect(400);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await createCircle();
    });

    it('should handle very small amounts', async () => {
      await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Penny',
          amount: 0.01,
          splitMethod: SPLIT_METHODS.EQUAL,
          splits: [{ user: userId }],
        })
        .expect(201);
    });

    it('should reject zero-value expenses', async () => {
      await agent
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          circleId,
          title: 'Zero',
          amount: 0,
          splitMethod: SPLIT_METHODS.EQUAL,
          splits: [{ user: userId }],
        })
        .expect(400);
    });
  });
});

describe('FinancialEngine', () => {
  it('should compute balances from scratch via aggregation', async () => {
    const user = await User.create({
      name: 'Bal User',
      email: 'bal@example.com',
      password: 'TestPass123!',
    });
    const circle = await Circle.create({ name: 'Bal Circle', owner: user._id });
    await Member.create({ user: user._id, circle: circle._id, role: 'owner' });

    const expense1 = await Expense.create({ circle: circle._id, paidBy: user._id, title: 'Expense A', amount: 50, splitMethod: 'equal' });
    const expense2 = await Expense.create({ circle: circle._id, paidBy: user._id, title: 'Expense B', amount: 30, splitMethod: 'equal' });
    await ExpenseSplit.create({ expense: expense1._id, user: user._id, amount: 50, isDeleted: false });
    await ExpenseSplit.create({ expense: expense2._id, user: user._id, amount: 30, isDeleted: false });

    const summary = await financialEngine.getCircleSummary(circle._id.toString());
    const memberBalance = summary.memberBalances.find(b => b.userId === user._id.toString());
    expect(memberBalance.totalPaid).toBeCloseTo(80, 1);
    // When a user is both payer and sole participant, totalOwed equals totalPaid
    expect(memberBalance.totalOwed).toBeCloseTo(80, 1);
    expect(memberBalance.netBalance).toBeCloseTo(0, 1);
  });

  it('should satisfy zero-sum invariant', async () => {
    const user = await User.create({
      name: 'Inv User',
      email: 'inv@example.com',
      password: 'TestPass123!',
    });
    const user2 = await User.create({
      name: 'Inv User 2',
      email: 'inv2@example.com',
      password: 'TestPass123!',
    });
    const circle = await Circle.create({ name: 'Inv Circle', owner: user._id });
    await Member.create({ user: user._id, circle: circle._id, role: 'owner' });
    await Member.create({ user: user2._id, circle: circle._id, role: 'member' });

    await Expense.create({ circle: circle._id, paidBy: user._id, title: 'Dinner', amount: 100, splitMethod: 'equal' });
    await ExpenseSplit.create({ expense: (await Expense.findOne({ title: 'Dinner' }))._id, user: user._id, amount: 50, isDeleted: false });
    await ExpenseSplit.create({ expense: (await Expense.findOne({ title: 'Dinner' }))._id, user: user2._id, amount: 50, isDeleted: false });

    const summary = await financialEngine.getCircleSummary(circle._id.toString());
    const sumNet = summary.memberBalances.reduce((s, b) => s + b.netBalance, 0);
    expect(Math.abs(sumNet)).toBeLessThanOrEqual(0.02);
  });
});
