/**
 * ExpenseFlow - Settlement Controller
 * HTTP request handlers for settlement management.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { settlementService } = require('../services');

const getBalances = catchAsync(async (req, res) => {
  const balances = await settlementService.calculateNetBalances(req.params.circleId);
  ApiResponse.success('Balances retrieved', balances).send(res);
});

const getSuggestedSettlements = catchAsync(async (req, res) => {
  const result = await settlementService.getSuggestedSettlements(req.params.circleId);
  ApiResponse.success('Suggested settlements retrieved', result).send(res);
});

const getSettlements = catchAsync(async (req, res) => {
  const result = await settlementService.getSettlements(req.params.circleId, req.userId, req.query);
  ApiResponse.success('Settlements retrieved', result.settlements, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

const getSettlementById = catchAsync(async (req, res) => {
  const settlement = await settlementService.getSettlementById(req.params.settlementId, req.userId);
  ApiResponse.success('Settlement retrieved', settlement).send(res);
});

const createSettlement = catchAsync(async (req, res) => {
  const settlement = await settlementService.createSettlement(req.userId, req.body);
  ApiResponse.created('Settlement created', settlement).send(res);
});

const confirmSettlement = catchAsync(async (req, res) => {
  const settlement = await settlementService.confirmSettlement(req.params.settlementId, req.userId);
  ApiResponse.success('Settlement confirmed', settlement).send(res);
});

const completeSettlement = catchAsync(async (req, res) => {
  const settlement = await settlementService.completeSettlement(req.params.settlementId, req.userId);
  ApiResponse.success('Settlement completed', settlement).send(res);
});

const partialSettlement = catchAsync(async (req, res) => {
  const settlement = await settlementService.partialSettlement(req.params.settlementId, req.userId, req.body.amount);
  ApiResponse.success('Partial settlement processed', settlement).send(res);
});

const cancelSettlement = catchAsync(async (req, res) => {
  const settlement = await settlementService.cancelSettlement(req.params.settlementId, req.userId);
  ApiResponse.success('Settlement cancelled', settlement).send(res);
});

const getAllSettlements = catchAsync(async (req, res) => {
  const result = await settlementService.getAllSettlements(req.userId, req.query);
  ApiResponse.success('Settlements retrieved', result.settlements, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

module.exports = {
  getBalances,
  getSuggestedSettlements,
  getSettlements,
  getSettlementById,
  createSettlement,
  confirmSettlement,
  completeSettlement,
  partialSettlement,
  cancelSettlement,
  getAllSettlements,
};
