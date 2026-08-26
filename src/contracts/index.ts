/**
 * Design by Contract (DbC) and Defensive Programming Primitives.
 *
 * Provides typed precondition, postcondition, and invariant assertions
 * that compile to zero-overhead branches in production release bundles
 * when ASSERT_LEVEL === 'none' (inlined at build time via
 * `bun build --define process.env.ASSERT_LEVEL='"none"'`; unset means
 * 'debug' — full checks — in dev and test runs).
 *
 * For external input validation, auth guards, and security boundaries,
 * use always-on domain validators or brand constructors instead.
 */

import { PreconditionError, InvariantError, PostconditionError } from './errors';
export * from './errors';
export * from './brands';

export interface SoftViolation {
  message: string;
  metadata?: Record<string, unknown>;
}

export type SoftViolationHandler = (violation: SoftViolation) => void;

let softViolationHandler: SoftViolationHandler = (violation) => {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[DbC Soft Violation]: ${violation.message}`, violation.metadata ?? '');
  }
};

/**
 * Configure custom telemetry handler for soft contract violations.
 */
export function setSoftViolationHandler(handler: SoftViolationHandler): void {
  softViolationHandler = handler;
}

/**
 * Reset soft violation handler to default console logger.
 */
export function resetSoftViolationHandler(): void {
  softViolationHandler = (violation) => {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[DbC Soft Violation]: ${violation.message}`, violation.metadata ?? '');
    }
  };
}

/**
 * Internal evaluator. Throws typed contract error on failure when assertions are active.
 */
function evaluateAssert(
  condition: boolean,
  errorClass: new (msg: string) => Error,
  message: string
): asserts condition {
  if (process.env.ASSERT_LEVEL === 'none') {
    return;
  }

  if (!condition) {
    throw new errorClass(message);
  }
}

/**
 * Enforces a function or method precondition.
 * Fails fast by throwing PreconditionError if condition is false.
 */
export function requires(condition: boolean, msg = 'Precondition unmet'): asserts condition {
  evaluateAssert(condition, PreconditionError, msg);
}

/**
 * Enforces a class or module invariant.
 * Fails fast by throwing InvariantError if condition is false.
 */
export function checks(condition: boolean, msg = 'Invariant violated'): asserts condition {
  evaluateAssert(condition, InvariantError, msg);
}

/**
 * Enforces a method postcondition.
 * Fails fast by throwing PostconditionError if condition is false.
 */
export function ensures(condition: boolean, msg = 'Postcondition failed'): asserts condition {
  evaluateAssert(condition, PostconditionError, msg);
}

/**
 * Asserts that a value is non-null and non-undefined, narrowing its TypeScript type.
 * Throws PreconditionError if null or undefined.
 */
export function requiresNonNullish<T>(
  val: T | null | undefined,
  msg = 'Value is null or undefined'
): NonNullable<T> {
  evaluateAssert(val !== null && val !== undefined, PreconditionError, msg);
  return val as NonNullable<T>;
}

/**
 * Non-throwing soft check for telemetry monitoring and graceful degradation.
 * Returns true if condition holds. If false, notifies the soft violation handler
 * and returns false without throwing or faking type narrowing.
 */
export function softCheck(
  condition: boolean,
  msg: string,
  metadata?: Record<string, unknown>
): boolean {
  if (condition) {
    return true;
  }

  softViolationHandler({ message: msg, metadata });
  return false;
}
