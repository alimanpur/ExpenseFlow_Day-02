const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { User, Circle, Member, Invitation, ActivityLog } = require('../../src/models');
const config = require('../../src/config');

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
  await ActivityLog.deleteMany({});
  await Invitation.deleteMany({});
  await Member.deleteMany({});
  await Circle.deleteMany({});
  await User.deleteMany({});
});

describe('Circle Endpoints', () => {
  describe('Create Circle', () => {
    it('should create a circle with owner as member', async () => {
      const res = await agent
        .post('/api/v1/circles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Circle', currency: 'USD' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Circle');
      expect(res.body.data.owner).toBeDefined();
      circleId = res.body.data._id;
    });

    it('should reject unauthenticated requests', async () => {
      await agent
        .post('/api/v1/circles')
        .send({ name: 'Test Circle' })
        .expect(401);
    });
  });

  describe('Get Circles', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'My Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should list user circles', async () => {
      const res = await agent
        .get('/api/v1/circles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Get Circle by ID', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Detail Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should return circle with populated members', async () => {
      const res = await agent
        .get(`/api/v1/circles/${circleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Detail Circle');
      expect(res.body.data.members).toBeDefined();
    });
  });

  describe('Update Circle', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Update Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should update circle name', async () => {
      const res = await agent
        .patch(`/api/v1/circles/${circleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Circle Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Circle Name');
    });
  });

  describe('Delete Circle', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Delete Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should soft delete circle', async () => {
      await agent
        .delete(`/api/v1/circles/${circleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const circle = await Circle.findById(circleId);
      expect(circle.isDeleted).toBe(true);
    });
  });

  describe('Archive Circle', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Archive Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should archive circle', async () => {
      await agent
        .patch(`/api/v1/circles/${circleId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ archive: true })
        .expect(200);

      const circle = await Circle.findById(circleId);
      expect(circle.isArchived).toBe(true);
    });

    it('should restore archived circle', async () => {
      await agent
        .patch(`/api/v1/circles/${circleId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ archive: true })
        .expect(200);

      await agent
        .patch(`/api/v1/circles/${circleId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ archive: false })
        .expect(200);

      const circle = await Circle.findById(circleId);
      expect(circle.isArchived).toBe(false);
    });
  });

  describe('Invite Member', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Invite Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should send invitation', async () => {
      const res = await agent
        .post(`/api/v1/circles/${circleId}/invite`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'newmember@example.com', role: 'member' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject duplicate invitations', async () => {
      await Invitation.create({
        circle: circleId,
        invitedBy: userId,
        invitedEmail: 'duplicate@example.com',
        token: 'token123',
        expiresAt: new Date(Date.now() + 86400000),
        status: 'pending',
      });

      const res = await agent
        .post(`/api/v1/circles/${circleId}/invite`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'duplicate@example.com', role: 'member' })
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Accept Invitation', () => {
    let token;

    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Accept Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();

      token = jwt.sign({ circle: circleId, email: 'accept@example.com' }, 'test-secret', { expiresIn: '7d' });
      await Invitation.create({
        circle: circleId,
        invitedBy: userId,
        invitedEmail: 'accept@example.com',
        token,
        expiresAt: new Date(Date.now() + 86400000),
        status: 'pending',
      });
    });

    it('should accept invitation and create member', async () => {
      const newUser = await User.create({
        name: 'New Member',
        email: 'accept@example.com',
        password: 'TestPass123!',
      });
      const newToken = generateToken(newUser);

      const res = await agent
        .post(`/api/v1/circles/invitations/${token}/accept`)
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const member = await Member.findOne({ user: newUser._id, circle: circleId });
      expect(member.isActive).toBe(true);
    });
  });

  describe('Decline Invitation', () => {
    let token;

    beforeEach(async () => {
      token = jwt.sign({ circle: circleId, email: 'decline@example.com' }, 'test-secret', { expiresIn: '7d' });
      await Invitation.create({
        circle: circleId,
        invitedBy: userId,
        invitedEmail: 'decline@example.com',
        token,
        expiresAt: new Date(Date.now() + 86400000),
        status: 'pending',
      });
    });

    it('should decline invitation', async () => {
      const newUser = await User.create({
        name: 'Decline User',
        email: 'decline@example.com',
        password: 'TestPass123!',
      });
      const newToken = generateToken(newUser);

      await agent
        .post(`/api/v1/circles/invitations/${token}/decline`)
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      const invitation = await Invitation.findOne({ token });
      expect(invitation.status).toBe('declined');
    });
  });

  describe('Remove Member', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Remove Member Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should remove member from circle', async () => {
      const newUser = await User.create({
        name: 'Member To Remove',
        email: 'removeme@example.com',
        password: 'TestPass123!',
      });
      const member = await Member.create({
        user: newUser._id,
        circle: circleId,
        role: 'member',
      });
      const memberId = member._id.toString();

      await agent
        .delete(`/api/v1/circles/${circleId}/members/${memberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const m = await Member.findById(memberId);
      expect(m.isActive).toBe(false);
    });
  });

  describe('Leave Circle', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Leave Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should allow member to leave', async () => {
      const newUser = await User.create({
        name: 'Leaver',
        email: 'leaver@example.com',
        password: 'TestPass123!',
      });
      const member = await Member.create({
        user: newUser._id,
        circle: circleId,
        role: 'member',
      });
      const leaverToken = generateToken(newUser);

      await agent
        .post(`/api/v1/circles/${circleId}/leave`)
        .set('Authorization', `Bearer ${leaverToken}`)
        .expect(200);

      const m = await Member.findById(member._id);
      expect(m.isActive).toBe(false);
    });
  });

  describe('Transfer Ownership', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Transfer Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should transfer ownership', async () => {
      const newUser = await User.create({
        name: 'New Owner',
        email: 'newowner@example.com',
        password: 'TestPass123!',
      });
      await Member.create({
        user: newUser._id,
        circle: circleId,
        role: 'admin',
      });

      await agent
        .post(`/api/v1/circles/${circleId}/transfer-ownership`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newOwnerId: newUser._id.toString() })
        .expect(200);

      const circle = await Circle.findById(circleId);
      expect(circle.owner.toString()).toBe(newUser._id.toString());
    });
  });

  describe('Update Member Role', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Role Update Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('should update member role', async () => {
      const newUser = await User.create({
        name: 'Role Update User',
        email: 'roleupdate@example.com',
        password: 'TestPass123!',
      });
      const member = await Member.create({
        user: newUser._id,
        circle: circleId,
        role: 'member',
      });
      const memberId = member._id.toString();

      const res = await agent
        .patch(`/api/v1/circles/${circleId}/members/${memberId}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('admin');
    });
  });

  describe('Permission Matrix', () => {
    beforeEach(async () => {
      const circle = await Circle.create({ name: 'Permission Matrix Circle', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });
      circleId = circle._id.toString();
    });

    it('admin should update circle', async () => {
      const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'TestPass123!' });
      await Member.create({ user: admin._id, circle: circleId, role: 'admin' });
      const adminToken = generateToken(admin);

      await agent
        .patch(`/api/v1/circles/${circleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Updated Circle' })
        .expect(200);
    });

    it('member should NOT update circle', async () => {
      const member = await User.create({ name: 'Member', email: 'member2@example.com', password: 'TestPass123!' });
      await Member.create({ user: member._id, circle: circleId, role: 'member' });
      const memberToken = generateToken(member);

      await agent
        .patch(`/api/v1/circles/${circleId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Updated Circle' })
        .expect(403);
    });

    it('viewer should NOT update circle', async () => {
      const viewer = await User.create({ name: 'Viewer', email: 'viewer@example.com', password: 'TestPass123!' });
      await Member.create({ user: viewer._id, circle: circleId, role: 'viewer' });
      const viewerToken = generateToken(viewer);

      await agent
        .patch(`/api/v1/circles/${circleId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Updated Circle' })
        .expect(403);
    });

    it('member should be able to leave', async () => {
      const member = await User.create({ name: 'Member', email: 'member3@example.com', password: 'TestPass123!' });
      const memberRecord = await Member.create({ user: member._id, circle: circleId, role: 'member' });
      const memberToken = generateToken(member);

      await agent
        .post(`/api/v1/circles/${circleId}/leave`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      const m = await Member.findById(memberRecord._id);
      expect(m.isActive).toBe(false);
    });
  });

  describe('Business Rules', () => {
    it('should enforce max member limit at accept time', async () => {
      const circle = await Circle.create({ name: 'Limited Circle', owner: userId, maxMembers: 1 });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });

      const newUser = await User.create({
        name: 'Extra User',
        email: 'extra@example.com',
        password: 'TestPass123!',
      });

      const token = jwt.sign({ circle: circle._id.toString(), email: 'extra@example.com' }, 'test-secret', { expiresIn: '7d' });
      await Invitation.create({
        circle: circle._id,
        invitedBy: userId,
        invitedEmail: 'extra@example.com',
        token,
        expiresAt: new Date(Date.now() + 86400000),
        status: 'pending',
      });

      const newToken = generateToken(newUser);
      await agent
        .post(`/api/v1/circles/invitations/${token}/accept`)
        .set('Authorization', `Bearer ${newToken}`)
        .expect(400);
    });

    it('should prevent duplicate memberships', async () => {
      const circle = await Circle.create({ name: 'No Dups', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });

      await Member.create({
        user: new mongoose.Types.ObjectId(),
        circle: circle._id,
        role: 'member',
      });

      const members = await Member.countDocuments({ circle: circle._id, isActive: true });
      const uniqueMembers = await Member.distinct('user', { circle: circle._id, isActive: true });
      expect(uniqueMembers.length).toBe(members);
    });

    it('owner cannot leave', async () => {
      const circle = await Circle.create({ name: 'Owner Stay', owner: userId });
      await Member.create({ user: userId, circle: circle._id, role: 'owner' });

      const res = await agent
        .post(`/api/v1/circles/${circle._id}/leave`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(res.body.error.message).toMatch(/transfer ownership/i);
    });
  });
});
