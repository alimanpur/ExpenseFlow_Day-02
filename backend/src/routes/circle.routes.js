/**
 * ExpenseFlow - Circle Routes
 * Circle/group management routes.
 */
const { Router } = require('express');
const { circleController } = require('../controllers');
const { authenticate, validate, requireRole } = require('../middleware');
const { circleValidator } = require('../validators');
const { ROLES } = require('../constants');

const router = Router();

// All circle routes require authentication
router.use(authenticate);

// User invitations
router.get('/invitations', validate(circleValidator.paramsOnlySchema), circleController.getUserInvitations);

// Aggregated people across all the user's circles
router.get('/people', circleController.getPeople);

// Circle CRUD
router.post('/', validate(circleValidator.createCircleSchema), circleController.createCircle);
router.get('/', validate(circleValidator.getUserCirclesSchema), circleController.getUserCircles);
router.get('/:circleId', validate(circleValidator.circleIdParamSchema), circleController.getCircle);
router.patch('/:circleId',
  authenticate,
  validate(circleValidator.circleIdParamSchema),
  validate(circleValidator.updateCircleSchema),
  requireRole(ROLES.OWNER, ROLES.ADMIN),
  circleController.updateCircle
);
router.delete('/:circleId', validate(circleValidator.circleIdParamSchema), authenticate, requireRole(ROLES.OWNER), circleController.deleteCircle);
router.patch('/:circleId/archive', validate(circleValidator.circleIdParamSchema), authenticate, requireRole(ROLES.OWNER, ROLES.ADMIN), circleController.archiveCircle);

// Members
router.get('/:circleId/members', validate(circleValidator.circleIdParamSchema), circleController.getCircleMembers);
router.post('/:circleId/invite', validate(circleValidator.circleIdParamSchema), validate(circleValidator.inviteMemberSchema), requireRole(ROLES.OWNER, ROLES.ADMIN), circleController.inviteMember);
router.post('/:circleId/members/add-by-name', validate(circleValidator.circleIdParamSchema), validate(circleValidator.addMemberByNameSchema), requireRole(ROLES.OWNER, ROLES.ADMIN), circleController.addMemberByName);
router.delete('/:circleId/members/:memberId', validate(circleValidator.circleAndMemberIdParamSchema), authenticate, requireRole(ROLES.OWNER, ROLES.ADMIN), circleController.removeMember);
router.post('/:circleId/leave', validate(circleValidator.circleIdParamSchema), authenticate, circleController.leaveCircle);
router.post('/:circleId/transfer-ownership', validate(circleValidator.circleIdParamSchema), validate(circleValidator.transferOwnershipSchema), authenticate, requireRole(ROLES.OWNER), circleController.transferOwnership);
router.patch('/:circleId/members/:memberId/role', validate(circleValidator.circleAndMemberIdParamSchema), authenticate, requireRole(ROLES.OWNER), validate(circleValidator.updateMemberRoleSchema), circleController.updateMemberRole);

// Invitations
router.get('/:circleId/invitations', validate(circleValidator.circleIdParamSchema), circleController.getCircleInvitations);
router.post('/invitations/:token/accept', validate(circleValidator.tokenParamSchema), authenticate, circleController.acceptInvitation);
router.post('/invitations/:token/decline', validate(circleValidator.tokenParamSchema), authenticate, circleController.declineInvitation);

module.exports = router;