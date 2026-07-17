const { splitEngine } = require('../../src/services');
const { SPLIT_METHODS } = require('../../src/constants');

describe('SplitEngine', () => {
  const users = ['u1', 'u2', 'u3', 'u4', 'u5'];

  describe('Equal Split', () => {
    it('should split evenly among 3 members', () => {
      const result = splitEngine.calculate(90, SPLIT_METHODS.EQUAL, users.slice(0, 3).map((u) => ({ user: u })));
      expect(result.success).toBe(true);
      expect(result.method).toBe('equal');
      expect(result.splits).toHaveLength(3);
      expect(result.splits.map((s) => s.amount)).toEqual([30, 30, 30]);
      expect(result.summary.totalAmount).toBe(90);
      expect(result.summary.allocatedAmount).toBe(90);
    });

    it('should handle remainder by giving it to first member', () => {
      const result = splitEngine.calculate(100, SPLIT_METHODS.EQUAL, users.slice(0, 3).map((u) => ({ user: u })));
      const amounts = result.splits.map((s) => s.amount);
      expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);
      expect(amounts[0]).toBeCloseTo(33.34, 1);
    });

    it('should handle empty splits', () => {
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.EQUAL, [])).toThrow();
    });

    it('should handle odd-number division (5 members)', () => {
      const result = splitEngine.calculate(101, SPLIT_METHODS.EQUAL, users.map((u) => ({ user: u })));
      const total = result.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeCloseTo(101, 1);
      expect(result.splits).toHaveLength(5);
    });
  });

  describe('Percentage Split', () => {
    it('should split correctly with exact percentages', () => {
      const splits = [
        { user: 'u1', percentage: 50 },
        { user: 'u2', percentage: 30 },
        { user: 'u3', percentage: 20 },
      ];
      const result = splitEngine.calculate(100, SPLIT_METHODS.PERCENTAGE, splits);
      expect(result.splits.map((s) => s.amount)).toEqual([50, 30, 20]);
      expect(result.splits.map((s) => s.percentage)).toEqual([50, 30, 20]);
    });

    it('should absorb rounding error in first member', () => {
      const splits = [
        { user: 'u1', percentage: 33.33 },
        { user: 'u2', percentage: 33.33 },
        { user: 'u3', percentage: 33.34 },
      ];
      const result = splitEngine.calculate(100, SPLIT_METHODS.PERCENTAGE, splits);
      const total = result.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeCloseTo(100, 1);
    });

    it('should reject percentages not totaling 100%', () => {
      const splits = [
        { user: 'u1', percentage: 50 },
        { user: 'u2', percentage: 40 },
      ];
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.PERCENTAGE, splits)).toThrow();
    });

    it('should reject percentages summing to 99.98', () => {
      const splits = [
        { user: 'u1', percentage: 50 },
        { user: 'u2', percentage: 49.98 },
      ];
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.PERCENTAGE, splits)).toThrow();
    });
  });

  describe('Exact Split', () => {
    it('should accept exact amounts', () => {
      const splits = [
        { user: 'u1', amount: 30 },
        { user: 'u2', amount: 30 },
        { user: 'u3', amount: 40 },
      ];
      const result = splitEngine.calculate(100, SPLIT_METHODS.EXACT, splits);
      expect(result.splits.map((s) => s.amount)).toEqual([30, 30, 40]);
    });

    it('should reject sums that do not equal total', () => {
      const splits = [
        { user: 'u1', amount: 30 },
        { user: 'u2', amount: 30 },
        { user: 'u3', amount: 39 },
      ];
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.EXACT, splits)).toThrow();
    });

    it('should handle decimal exact amounts', () => {
      const splits = [
        { user: 'u1', amount: 33.33 },
        { user: 'u2', amount: 33.33 },
        { user: 'u3', amount: 33.34 },
      ];
      const result = splitEngine.calculate(100, SPLIT_METHODS.EXACT, splits);
      expect(result.splits.map((s) => s.amount)).toEqual([33.33, 33.33, 33.34]);
    });
  });

  describe('Shares Split', () => {
    it('should split proportionally by shares', () => {
      const splits = [
        { user: 'u1', shares: 2 },
        { user: 'u2', shares: 2 },
        { user: 'u3', shares: 1 },
      ];
      const result = splitEngine.calculate(100, SPLIT_METHODS.SHARES, splits);
      const amounts = result.splits.map((s) => s.amount);
      expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);
      expect(amounts[0]).toBeCloseTo(40, 1);
      expect(amounts[1]).toBeCloseTo(40, 1);
      expect(amounts[2]).toBeCloseTo(20, 1);
    });

    it('should handle unequal shares with remainder', () => {
      const splits = [
        { user: 'u1', shares: 3 },
        { user: 'u2', shares: 7 },
      ];
      const result = splitEngine.calculate(100, SPLIT_METHODS.SHARES, splits);
      const total = result.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeCloseTo(100, 1);
      expect(result.splits[0].amount).toBeCloseTo(30.01, 1);
      expect(result.splits[1].amount).toBeCloseTo(69.99, 1);
    });
  });

  describe('Custom Split', () => {
    it('should accept arbitrary amounts that sum to total', () => {
      const splits = [
        { user: 'u1', amount: 10 },
        { user: 'u2', amount: 20 },
        { user: 'u3', amount: 70 },
      ];
      const result = splitEngine.calculate(100, SPLIT_METHODS.CUSTOM, splits);
      expect(result.splits.map((s) => s.amount)).toEqual([10, 20, 70]);
    });

    it('should reject negative amounts', () => {
      const splits = [
        { user: 'u1', amount: -10 },
        { user: 'u2', amount: 110 },
      ];
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.CUSTOM, splits)).toThrow();
    });
  });

  describe('Business Rules', () => {
    it('should reject negative total amount', () => {
      const splits = users.slice(0, 2).map((u) => ({ user: u }));
      expect(() => splitEngine.calculate(-100, SPLIT_METHODS.EQUAL, splits)).toThrow();
    });

    it('should reject zero amount', () => {
      const splits = users.slice(0, 2).map((u) => ({ user: u }));
      expect(() => splitEngine.calculate(0, SPLIT_METHODS.EQUAL, splits)).toThrow();
    });

    it('should reject duplicate members', () => {
      const splits = [
        { user: 'u1' },
        { user: 'u1' },
      ];
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.EQUAL, splits)).toThrow();
    });

    it('should reject archived circle context', () => {
      const splits = users.slice(0, 2).map((u) => ({ user: u }));
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.EQUAL, splits, { archivedCircle: true, circleId: 'c1' })).toThrow();
    });

    it('should reject deleted circle context', () => {
      const splits = users.slice(0, 2).map((u) => ({ user: u }));
      expect(() => splitEngine.calculate(100, SPLIT_METHODS.EQUAL, splits, { deletedCircle: true, circleId: 'c1' })).toThrow();
    });

    it('should reject invalid split method', () => {
      const splits = users.slice(0, 2).map((u) => ({ user: u }));
      expect(() => splitEngine.calculate(100, 'invalid-method', splits)).toThrow();
    });
  });

  describe('Decimal Edge Cases', () => {
    it('should handle very small values', () => {
      const splits = users.slice(0, 2).map((u) => ({ user: u }));
      const result = splitEngine.calculate(0.01, SPLIT_METHODS.EQUAL, splits);
      expect(result.splits.reduce((a, b) => a + b.amount, 0)).toBeCloseTo(0.01, 2);
    });

    it('should handle large values', () => {
      const splits = users.slice(0, 3).map((u) => ({ user: u }));
      const result = splitEngine.calculate(1000000.55, SPLIT_METHODS.EQUAL, splits);
      const total = result.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeCloseTo(1000000.55, 1);
    });

    it('should handle hanging decimal precision', () => {
      const splits = users.slice(0, 3).map((u) => ({ user: u }));
      const result = splitEngine.calculate(33.33, SPLIT_METHODS.EQUAL, splits);
      const total = result.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeCloseTo(33.33, 2);
    });
  });

  describe('Determinism', () => {
    it('should return identical results for identical inputs', () => {
      const splits = users.slice(0, 4).map((u) => ({ user: u, percentage: 25 }));
      const r1 = splitEngine.calculate(100, SPLIT_METHODS.PERCENTAGE, splits);
      const r2 = splitEngine.calculate(100, SPLIT_METHODS.PERCENTAGE, splits);
      expect(r1.splits).toEqual(r2.splits);
    });
  });
});
