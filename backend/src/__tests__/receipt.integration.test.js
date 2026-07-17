const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { User, Expense, Member, Receipt, Circle } = require('../models');
const config = require('../config');
const { SPLIT_METHODS } = require('../constants');

let mongod;
let accessToken;
let userId;
let expenseId;

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
    name: 'Receipt Test User',
    email: 'receipttest@example.com',
    password: 'TestPass123!',
  });
  userId = user._id.toString();
  accessToken = generateToken(user);

  const circle = await Circle.create({ name: 'Receipt Circle', owner: userId, currency: 'USD' });
  await Member.create({ user: userId, circle: circle._id, role: 'owner' });

  const expense = await Expense.create({
    circle: circle._id,
    paidBy: userId,
    title: 'Receipt Test Expense',
    amount: 100,
    splitMethod: SPLIT_METHODS.EQUAL,
    splits: [{ user: userId, amount: 100 }],
  });
  expenseId = expense._id.toString();
});

afterEach(async () => {
  await Receipt.deleteMany({});
  await Member.deleteMany({});
  await Expense.deleteMany({});
  await User.deleteMany({});
});

describe('Receipt Upload Endpoints', () => {
  it('should upload a receipt', async () => {
    const res =     await agent
      .post(`/api/v1/expenses/${expenseId}/receipt`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('receipt', Buffer.from('fake image content'), { filename: 'receipt.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.originalFilename).toBe('receipt.jpg');
    expect(res.body.data.mimeType).toBe('image/jpeg');
    expect(res.body.data.uploadedBy).toBe(userId);
    expect(res.body.data.storageProvider).toBe('local');
  });

  it('should reject invalid file type', async () => {
    await agent
      .post(`/api/v1/expenses/${expenseId}/receipt`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('receipt', Buffer.from('fake pdf content'), { filename: 'receipt.txt', contentType: 'text/plain' })
      .expect(400);
  });

  it('should replace an existing receipt', async () => {
    const uploadRes = await agent
      .post(`/api/v1/expenses/${expenseId}/receipt`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('receipt', Buffer.from('original'), { filename: 'old.jpg', contentType: 'image/jpeg' })
      .expect(201);

    const receiptId = uploadRes.body.data._id;

    const replaceRes = await agent
      .patch(`/api/v1/expenses/${expenseId}/receipt/${receiptId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('receipt', Buffer.from('replacement'), { filename: 'new.jpg', contentType: 'image/jpeg' })
      .expect(200);

    expect(replaceRes.body.success).toBe(true);
    expect(replaceRes.body.data.originalFilename).toBe('new.jpg');
  });

  it('should delete a receipt', async () => {
    const uploadRes = await agent
      .post(`/api/v1/expenses/${expenseId}/receipt`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('receipt', Buffer.from('to delete'), { filename: 'delete.jpg', contentType: 'image/jpeg' })
      .expect(201);

    const receiptId = uploadRes.body.data._id;

    const deleteRes = await agent
      .delete(`/api/v1/expenses/${expenseId}/receipt/${receiptId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(deleteRes.body.success).toBe(true);

    const receipt = await Receipt.findById(receiptId);
    expect(receipt.isDeleted).toBe(true);
  });

  it('should retrieve receipt metadata', async () => {
    const uploadRes = await agent
      .post(`/api/v1/expenses/${expenseId}/receipt`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('receipt', Buffer.from('metadata'), { filename: 'meta.jpg', contentType: 'image/jpeg' })
      .expect(201);

    const receiptId = uploadRes.body.data._id;

    const metaRes = await agent
      .get(`/api/v1/expenses/${expenseId}/receipt/${receiptId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(metaRes.body.success).toBe(true);
    expect(metaRes.body.data.originalFilename).toBe('meta.jpg');
    expect(metaRes.body.data.fileSize).toBeDefined();
    expect(metaRes.body.data.createdAt).toBeDefined();
  });
});
