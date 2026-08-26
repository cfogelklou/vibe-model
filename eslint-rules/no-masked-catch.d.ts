// Type declaration for the local ESLint rule, consumed by its RuleTester test.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const noMaskedCatch: {
  meta: { type: any; docs: { description: string }; schema: any[]; messages: Record<string, string> };
  create: (context: any) => Record<string, (node: any) => void>;
};

export default noMaskedCatch;
