const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User, Circle, Member, Expense, ExpenseSplit } = require('../models');
const circleService = require('../services/circle.service');
const expenseService = require('../services/expense.service');
const authService = require('../services/auth.service');
const financialEngine = require('../services/financial.engine');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Guest Member Lifecycle (Phase D, Step 6)', () => {
  let ownerId;
  let circleId;
  let guestId;

  beforeEach(async () => {
    const owner = await User.create({ name: 'Owner One', email: 'owner-gh@example.com', password: 'TestPass123!' });
    ownerId = owner._id.toString();
    const circle = await Circle.create({ name: 'Trip', owner: owner._id, currency: 'USD' });
    circleId = circle._id.toString();
    await Member.create({ user: owner._id, circle: circle._id, role: 'owner' });
    const added = await circleService.addMemberByName(circleId, ownerId, { name: 'Zen' });
    guestId = added.member._id.toString();
  });

  afterEach(async () => {
    await ExpenseSplit.deleteMany({});
    await Expense.deleteMany({});
    await Member.deleteMany({});
    await Circle.deleteMany({});
    await User.deleteMany({});
  });

  it('attributes balances to a guest member while they participate', async () => {
    await expenseService.createExpense(ownerId, {
      circleId,
      title: 'Dinner',
      amount: 100,
      currency: 'USD',
      paidBy: ownerId,
      splitMethod: 'equal',
      date: new Date().toISOString(),
      splits: [{ user: ownerId, amount: 50 }, { user: guestId, amount: 50 }],
    });

    const summary = await financialEngine.getCircleSummary(circleId);
    const guestBalance = summary.memberBalances.find(b => b.userId === guestId);
    expect(Math.round(guestBalance.totalPaid)).toBe(0);
    expect(Math.round(guestBalance.totalOwed)).toBe(50);
    expect(Math.round(guestBalance.netBalance)).toBe(-50);
  });

  it('detects a matching guest on registration', async () => {
    const registered = await authService.register({
      name: 'Zen',
      email: 'zen-gh@example.com',
      password: 'TestPass123!',
    });
    expect(registered.matchedGuests.length).toBe(1);
    expect(registered.matchedGuests[0].displayName).toBe('Zen');
    expect(registered.matchedGuests[0].memberId.toString()).toBe(guestId);
  });

  it('allows a guest to be the payer of an expense (guest can receive)', async () => {
    await expenseService.createExpense(ownerId, {
      circleId,
      title: 'Guest Paid Lunch',
      amount: 100,
      currency: 'USD',
      paidBy: guestId,
      splitMethod: 'equal',
      date: new Date().toISOString(),
      splits: [{ user: guestId, amount: 50 }, { user: ownerId, amount: 50 }],
    });

    const summary = await financialEngine.getCircleSummary(circleId);
    const guestBalance = summary.memberBalances.find(b => b.userId === guestId);
    expect(Math.round(guestBalance.totalPaid)).toBe(100);
    expect(Math.round(guestBalance.totalOwed)).toBe(50);
    expect(Math.round(guestBalance.netBalance)).toBe(50);
  });

  it('merges a guest into the new account, preserving balances and references', async () => {
    await expenseService.createExpense(ownerId, {
      circleId,
      title: 'Dinner',
      amount: 100,
      currency: 'USD',
      paidBy: ownerId,
      splitMethod: 'equal',
      date: new Date().toISOString(),
      splits: [{ user: ownerId, amount: 50 }, { user: guestId, amount: 50 }],
    });

    const registered = await authService.register({
      name: 'Zen',
      email: 'zen-merge@example.com',
      password: 'TestPass123!',
    });
    const zenId = registered.user._id.toString();

    const linkResult = await authService.linkGuest(guestId, zenId);
    expect(linkResult.linked).toBe(true);

    // Guest member doc becomes a registered member tied to the user.
    const merged = await Member.findById(guestId).lean();
    expect(merged.user.toString()).toBe(zenId);
    expect(merged.isGuest).toBe(false);
    expect(merged.status).toBe('registered');

    const summary = await financialEngine.getCircleSummary(circleId);
    const mergedBalance = summary.memberBalances.find(b => b.userId === zenId);
    expect(Math.round(mergedBalance.totalOwed)).toBe(50);
    expect(Math.round(mergedBalance.netBalance)).toBe(-50);

    // Financial references are remapped to the real user id.
    const expense = await Expense.findOne({ circle: circleId }).lean();
    expect(expense.paidBy.toString()).toBe(ownerId);
    const split = await ExpenseSplit.findOne({ expense: expense._id, user: zenId }).lean();
    expect(split).toBeTruthy();
    expect(split.user.toString()).toBe(zenId);

    // No duplicate members for this user+circle.
    const members = await Member.find({ user: zenId, circle: circleId, isDeleted: false });
    expect(members.length).toBe(1);
  });
});
