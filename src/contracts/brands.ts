/**
 * Domain Branded Types and Always-On Constructors.
 *
 * Branded types make invalid domain states unrepresentable at the type level.
 * Their constructors execute unconditionally in all build modes so that
 * untrusted or malformed values never receive a trusted brand.
 */

import { PreconditionError } from './errors';

declare const BrandSymbol: unique symbol;

export type Brand<T, B extends string> = T & { readonly [BrandSymbol]: B };

export type PositiveNumber = Brand<number, 'PositiveNumber'>;
export type NonEmptyString = Brand<string, 'NonEmptyString'>;

/**
 * Validates and brands a number as a positive finite number (> 0).
 * Always-on constructor: throws PreconditionError if invalid.
 */
export function toPositiveNumber(n: number, msg?: string): PositiveNumber {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new PreconditionError(msg ?? `Expected positive number, received ${n}`);
  }
  return n as PositiveNumber;
}

/**
 * Validates and brands a string as non-empty after trimming.
 * Always-on constructor: throws PreconditionError if empty or non-string.
 */
export function toNonEmptyString(s: string, msg?: string): NonEmptyString {
  if (typeof s !== 'string' || s.trim().length === 0) {
    throw new PreconditionError(msg ?? `Expected non-empty string, received "${String(s)}"`);
  }
  return s as NonEmptyString;
}
