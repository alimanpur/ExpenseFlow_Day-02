/**
 * ExpenseFlow - Settlement Routes
 * API endpoints for settlement management.
 */
const { Router } = require('express');
const { settlementController } = require('../controllers');
const { authenticate, validate } = require('../middleware');
const { settlementValidator } = require('../validators');

const router = Router();

// All settlement routes require authentication
router.use(authenticate);

// Get all settlements across all circles (for People page)
router.get('/', settlementController.getAllSettlements);

// Get suggested settlements and balances for a circle
router.get('/suggested/:circleId', settlementController.getSuggestedSettlements);

// Get balances for a circle
router.get('/balances/:circleId', settlementController.getBalances);

// Get settlements for a specific circle
router.get('/circles/:circleId/settlements', settlementController.getSettlements);

// Get settlement by ID
router.get('/:settlementId', settlementController.getSettlementById);

// Create a new settlement
router.post('/', validate(settlementValidator.createSettlementSchema), settlementController.createSettlement);

// Confirm a settlement
router.post('/:settlementId/confirm', settlementController.confirmSettlement);

// Complete a settlement
router.post('/:settlementId/complete', settlementController.completeSettlement);

// Process partial settlement
router.post('/:settlementId/partial', settlementController.partialSettlement);

// Cancel a settlement
router.post('/:settlementId/cancel', settlementController.cancelSettlement);

module.exports = router;