/**
 * no-masked-catch
 *
 * Flags a catch clause that performs a state transition (a call to one of the
 * configured state-mutator functions) while discarding the caught error:
 * either no binding, or every reference to the binding is a `void err`
 * discard. Such a catch conflates "the operation failed" with a legitimate
 * state, which turns "could not check" into a wrong state.
 *
 * Fix by classifying the error into the state (or rethrowing); if the
 * transition genuinely does not depend on the error, add a comment and use
 * the binding for logging instead of discarding it.
 *
 * Ported from closedloop_vibe (src/sharedSrc/eslint-rules/no-masked-catch.js)
 * with the state-transition callee list made configurable.
 */

const DEFAULT_STATE_TRANSITION_CALLEES = ['setMilestoneState', 'setPendingTransition', 'setState'];

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow masking a caught error into a non-error state transition',
    },
    schema: [
      {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
        description: 'Names of state-transition functions to guard. Defaults to setMilestoneState, setPendingTransition, setState.',
      },
    ],
    messages: {
      masked:
        'This catch performs a state transition while discarding the caught error{{param}}. ' +
        'Classify the error into the state or rethrow; a masked error turns "could not check" into a wrong state.',
    },
  },

  create(context) {
    const [optionCallees] = context.options;
    const stateTransitionCallees = new Set(
      Array.isArray(optionCallees) && optionCallees.length > 0
        ? optionCallees
        : DEFAULT_STATE_TRANSITION_CALLEES
    );

    function isStateTransition(node) {
      return (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        stateTransitionCallees.has(node.callee.name)
      );
    }

    /**
     * True when every reference to the catch param inside the body is a
     * `void param` discard (or there is no param at all).
     */
    function onlyDiscards(param, body) {
      if (!param) return true;
      let sawReference = false;
      let sawMeaningfulReference = false;
      for (const identifier of body.identifiers ?? []) {
        if (identifier.name !== param.name) continue;
        // Skip the binding's own declaration (catch param is not inside the body).
        sawReference = true;
        const parent = identifier.parent;
        const isVoidDiscard =
          parent &&
          parent.type === 'UnaryExpression' &&
          parent.operator === 'void' &&
          parent.argument === identifier;
        if (!isVoidDiscard) sawMeaningfulReference = true;
      }
      return !sawReference || !sawMeaningfulReference;
    }

    return {
      CatchClause(node) {
        const body = node.body;
        if (!body || body.type !== 'BlockStatement') return;
        const transitions = [];
        for (const statement of body.body) {
          for (const descendant of iterate(statement)) {
            if (isStateTransition(descendant)) transitions.push(descendant);
          }
        }
        if (transitions.length === 0) return;

        // Collect identifiers under each statement, excluding nested functions
        // (a nested closure referencing the error is still a discard for our
        // purposes only if it is a void call; keep it simple and treat nested
        // function bodies as out of scope for the rescue check).
        const identifiers = [];
        for (const statement of body.body) {
          for (const descendant of iterate(statement, /* enterFunctions */ false)) {
            if (descendant.type === 'Identifier') identifiers.push(descendant);
          }
        }
        const param = node.param && node.param.type === 'Identifier' ? node.param : null;
        const virtualBody = { identifiers };
        if (onlyDiscards(param, virtualBody)) {
          context.report({
            node,
            messageId: 'masked',
            data: { param: param ? ` ("${param.name}")` : '' },
          });
        }
      },
    };
  },
};

/** Depth-first iteration over a node's descendants (and the node itself). */
function* iterate(root, enterFunctions = true) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node.type !== 'string') continue;
    yield node;
    if (!enterFunctions && (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression')) {
      continue;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent' || key === 'tokens' || key === 'comments' || key === 'range') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === 'string') stack.push(child);
        }
      } else if (value && typeof value.type === 'string') {
        stack.push(value);
      }
    }
  }
}
