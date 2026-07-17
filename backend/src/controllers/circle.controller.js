/**
 * ExpenseFlow - Circle Controller
 * HTTP request handlers for circle/group management.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { circleService } = require('../services');

const createCircle = catchAsync(async (req, res) => {
  const circle = await circleService.createCircle(req.userId, req.body);
  ApiResponse.created('Circle created successfully', circle).send(res);
});

const getCircle = catchAsync(async (req, res) => {
  const circle = await circleService.getCircle(req.params.circleId, req.userId);
  ApiResponse.success('Circle retrieved', circle).send(res);
});

const getUserCircles = catchAsync(async (req, res) => {
  const result = await circleService.getUserCircles(req.userId, req.query);
  ApiResponse.success('Circles retrieved', result.circles, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

const updateCircle = catchAsync(async (req, res) => {
  const circle = await circleService.updateCircle(req.params.circleId, req.userId, req.body);
  ApiResponse.success('Circle updated', circle).send(res);
});

const deleteCircle = catchAsync(async (req, res) => {
  await circleService.deleteCircle(req.params.circleId, req.userId);
  ApiResponse.success('Circle deleted').send(res);
});

const archiveCircle = catchAsync(async (req, res) => {
  const circle = await circleService.archiveCircle(req.params.circleId, req.userId, req.body.archive !== false);
  ApiResponse.success(circle.isArchived ? 'Circle archived' : 'Circle unarchived', circle).send(res);
});

const inviteMember = catchAsync(async (req, res) => {
  const result = await circleService.inviteMember(req.params.circleId, req.userId, req.body);
  ApiResponse.success('Invitation sent', result).send(res);
});

const addMemberByName = catchAsync(async (req, res) => {
  const result = await circleService.addMemberByName(req.params.circleId, req.userId, req.body);
  ApiResponse.success('Guest member added', result).send(res);
});

const acceptInvitation = catchAsync(async (req, res) => {
  const member = await circleService.acceptInvitation(req.params.token, req.userId);
  ApiResponse.success('Invitation accepted', member).send(res);
});

const declineInvitation = catchAsync(async (req, res) => {
  await circleService.declineInvitation(req.params.token);
  ApiResponse.success('Invitation declined').send(res);
});

const removeMember = catchAsync(async (req, res) => {
  await circleService.removeMember(req.params.circleId, req.userId, req.params.memberId);
  ApiResponse.success('Member removed').send(res);
});

const leaveCircle = catchAsync(async (req, res) => {
  await circleService.leaveCircle(req.params.circleId, req.userId);
  ApiResponse.success('Left circle').send(res);
});

const transferOwnership = catchAsync(async (req, res) => {
  await circleService.transferOwnership(req.params.circleId, req.userId, req.body.newOwnerId);
  ApiResponse.success('Ownership transferred').send(res);
});

const getCircleInvitations = catchAsync(async (req, res) => {
  const invitations = await circleService.getCircleInvitations(req.params.circleId, req.userId);
  ApiResponse.success('Invitations retrieved', invitations).send(res);
});

const getUserInvitations = catchAsync(async (req, res) => {
  const invitations = await circleService.getUserInvitations(req.userId);
  ApiResponse.success('Invitations retrieved', invitations).send(res);
});

const getPeople = catchAsync(async (req, res) => {
  const people = await circleService.getPeople(req.userId);
  ApiResponse.success('People retrieved', people).send(res);
});

const getCircleMembers = catchAsync(async (req, res) => {
  const circle = await circleService.getCircle(req.params.circleId, req.userId);
  ApiResponse.success('Members retrieved', circle.members).send(res);
});

const updateMemberRole = catchAsync(async (req, res) => {
  const member = await circleService.updateMemberRole(req.params.circleId, req.userId, req.params.memberId, req.body.role);
  ApiResponse.success('Member role updated', member).send(res);
});

module.exports = {
  createCircle,
  getCircle,
  getUserCircles,
  updateCircle,
  deleteCircle,
  archiveCircle,
  inviteMember,
  addMemberByName,
  acceptInvitation,
  declineInvitation,
  removeMember,
  leaveCircle,
  transferOwnership,
  getCircleInvitations,
  getUserInvitations,
  getPeople,
  getCircleMembers,
  updateMemberRole,
};
