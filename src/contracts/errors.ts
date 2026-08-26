/**
 * Design by Contract (DbC) Error Classes.
 *
 * Distinct error types allow fine-grained test assertions, error tracing,
 * and boundary catching without string matching on Error messages.
 */

export class PreconditionError extends Error {
  override readonly name = 'PreconditionError';

  constructor(message = 'Precondition unmet') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvariantError extends Error {
  override readonly name = 'InvariantError';

  constructor(message = 'Invariant violated') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PostconditionError extends Error {
  override readonly name = 'PostconditionError';

  constructor(message = 'Postcondition failed') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
