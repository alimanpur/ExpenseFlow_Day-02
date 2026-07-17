/**
 * ExpenseFlow - Search Controller
 * HTTP request handlers for global search.
 */
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { searchService } = require('../services');

const globalSearch = catchAsync(async (req, res) => {
  const result = await searchService.globalSearch(req.userId, req.query);
  ApiResponse.success('Search results', result.results, {
    total: result.total,
    query: result.query,
  }).send(res);
});

module.exports = {
  globalSearch,
};