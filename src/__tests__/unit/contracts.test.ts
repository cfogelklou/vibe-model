import { afterEach, describe, expect, it, jest } from 'bun:test';

import {
  requires,
  checks,
  ensures,
  requiresNonNullish,
  softCheck,
  setSoftViolationHandler,
  resetSoftViolationHandler,
  PreconditionError,
  InvariantError,
  PostconditionError,
  toPositiveNumber,
  toNonEmptyString,
  SoftViolation,
} from '../../contracts';

describe('Design by Contract Primitives', () => {
  afterEach(() => {
    resetSoftViolationHandler();
    delete process.env.ASSERT_LEVEL;
  });

  describe('requires (Preconditions)', () => {
    it('passes silently when condition is true', () => {
      expect(() => requires(true)).not.toThrow();
      expect(() => requires(1 + 1 === 2, 'Math works')).not.toThrow();
    });

    it('throws PreconditionError when condition is false', () => {
      expect(() => requires(false)).toThrow(PreconditionError);
      expect(() => requires(false, 'Custom precondition error')).toThrow(
        'Custom precondition error'
      );
    });

    it('allows type narrowing downstream', () => {
      const val: string | null = 'hello';
      requires(val !== null);
      expect(val.toUpperCase()).toBe('HELLO');
    });
  });

  describe('checks (Invariants)', () => {
    it('passes silently when condition is true', () => {
      expect(() => checks(true)).not.toThrow();
    });

    it('throws InvariantError when condition is false', () => {
      expect(() => checks(false)).toThrow(InvariantError);
      expect(() => checks(false, 'Custom invariant error')).toThrow(
        'Custom invariant error'
      );
    });
  });

  describe('ensures (Postconditions)', () => {
    it('passes silently when condition is true', () => {
      expect(() => ensures(true)).not.toThrow();
    });

    it('throws PostconditionError when condition is false', () => {
      expect(() => ensures(false)).toThrow(PostconditionError);
      expect(() => ensures(false, 'Custom postcondition error')).toThrow(
        'Custom postcondition error'
      );
    });
  });

  describe('requiresNonNullish', () => {
    it('returns the non-nullish value unchanged', () => {
      expect(requiresNonNullish('hello')).toBe('hello');
      expect(requiresNonNullish(0)).toBe(0);
      expect(requiresNonNullish(false)).toBe(false);
      expect(requiresNonNullish('')).toBe('');
      const obj = { key: 'value' };
      expect(requiresNonNullish(obj)).toBe(obj);
    });

    it('throws PreconditionError when value is null or undefined', () => {
      expect(() => requiresNonNullish(null)).toThrow(PreconditionError);
      expect(() => requiresNonNullish(undefined)).toThrow(PreconditionError);
      expect(() => requiresNonNullish(null, 'Target must not be null')).toThrow(
        'Target must not be null'
      );
    });
  });

  describe('softCheck', () => {
    it('returns true and does not trigger handler on truthy condition', () => {
      const handler = jest.fn();
      setSoftViolationHandler(handler);

      const result = softCheck(true, 'Everything is fine');
      expect(result).toBe(true);
      expect(handler).not.toHaveBeenCalled();
    });

    it('returns false and triggers handler on falsy condition without throwing', () => {
      const violations: SoftViolation[] = [];
      setSoftViolationHandler((v) => violations.push(v));

      const result = softCheck(false, 'Non-fatal anomaly detected', { userId: '123' });
      expect(result).toBe(false);
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toBe('Non-fatal anomaly detected');
      expect(violations[0].metadata).toEqual({ userId: '123' });
    });
  });

  describe('Domain Branded Types (Always-On Constructors)', () => {
    it('toPositiveNumber accepts positive numbers', () => {
      expect(toPositiveNumber(42) as number).toBe(42);
      expect(toPositiveNumber(0.001) as number).toBe(0.001);
    });

    it('toPositiveNumber rejects zero and negative numbers', () => {
      expect(() => toPositiveNumber(0)).toThrow(PreconditionError);
      expect(() => toPositiveNumber(-10)).toThrow(PreconditionError);
      expect(() => toPositiveNumber(NaN)).toThrow(PreconditionError);
      expect(() => toPositiveNumber(Infinity)).toThrow(PreconditionError);
    });

    it('toNonEmptyString accepts non-empty strings', () => {
      expect(toNonEmptyString('valid') as string).toBe('valid');
      expect(toNonEmptyString('  valid with padding  ') as string).toBe('  valid with padding  ');
    });

    it('toNonEmptyString rejects empty or whitespace-only strings', () => {
      expect(() => toNonEmptyString('')).toThrow(PreconditionError);
      expect(() => toNonEmptyString('   ')).toThrow(PreconditionError);
      expect(() => toNonEmptyString(null as any)).toThrow(PreconditionError);
    });
  });

  describe('Disabled Mode (ASSERT_LEVEL=none)', () => {
    it('does not throw when assertions are disabled', () => {
      process.env.ASSERT_LEVEL = 'none';

      expect(() => requires(false)).not.toThrow();
      expect(() => checks(false)).not.toThrow();
      expect(() => ensures(false)).not.toThrow();
    });
  });
});
