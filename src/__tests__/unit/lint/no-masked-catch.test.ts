/**
 * RuleTester cases for the no-masked-catch local rule (registered as the
 * `local` plugin in eslint.config.js). A catch that performs a state
 * transition while discarding the caught error conflates "the operation
 * failed" with a legitimate state.
 */

import { describe, expect, it } from "bun:test";
import { RuleTester } from "eslint";
import rule from "../../../../eslint-rules/no-masked-catch.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2021, sourceType: "script" },
});

ruleTester.run("no-masked-catch", rule, {
  valid: [
    // Classifies the error into the state: references the binding.
    `try { read(); } catch (error) { setState(phaseFor(error)); }`,
    // Rethrows: no state transition with a discarded error.
    `try { read(); } catch (error) { throw error; }`,
    // State transition with no caught error at all (not a catch).
    `function f() { setState('ready'); }`,
    // Fallback catch that does not transition state (e.g. clipboard-style).
    `function read() { try { return readClipboard(); } catch (error) { return ''; } }`,
    // Logging the error is a meaningful reference.
    `try { read(); } catch (error) { console.warn(error); setState('ready'); }`,
    // Custom callee list via options: setState not in list, not flagged.
    {
      code: `try { read(); } catch (error) { setState('ready'); }`,
      options: [["transitionTo"]],
    },
    // Custom callee list via options: transitionTo discarded -> flagged below; here it IS referenced.
    {
      code: `try { read(); } catch (error) { transitionTo(phaseFor(error)); }`,
      options: [["transitionTo"]],
    },
  ],
  invalid: [
    // The loophole: void discard + state transition.
    {
      code: `try { read(); } catch (error) { setMilestoneState({ state: 'ready' }); void error; }`,
      errors: [{ messageId: "masked" }],
    },
    // Param bound but never referenced.
    {
      code: `try { read(); } catch (error) { setMilestoneState('waiting'); }`,
      errors: [{ messageId: "masked" }],
    },
    // Optional catch binding.
    {
      code: `try { read(); } catch { setPendingTransition(null); }`,
      errors: [{ messageId: "masked" }],
    },
    // Custom callee list via options: transitionTo discarded.
    {
      code: `try { read(); } catch { transitionTo('x'); }`,
      options: [["transitionTo"]],
      errors: [{ messageId: "masked" }],
    },
  ],
});

// RuleTester.run throws on failure; reaching here means all cases passed.
describe("no-masked-catch rule", () => {
  it("passes RuleTester cases above", () => {
    expect(true).toBe(true);
  });
});
