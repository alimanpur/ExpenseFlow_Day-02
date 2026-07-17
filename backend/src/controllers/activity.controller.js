/**
 * ExpenseFlow - Activity Timeline Controller
 * HTTP request handlers for activity timeline.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { activityService } = require('../services');

const getCircleActivities = catchAsync(async (req, res) => {
  const result = await activityService.getCircleActivities(req.params.circleId, req.userId, req.query);
  ApiResponse.success('Activities retrieved', result.activities, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

const getUserActivities = catchAsync(async (req, res) => {
  const result = await activityService.getUserActivities(req.userId, req.query);
  ApiResponse.success('Activities retrieved', result.activities, {
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  }).send(res);
});

module.exports = {
  getCircleActivities,
  getUserActivities,
};
