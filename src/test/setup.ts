import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Registers the jest-dom matchers (toBeInTheDocument, toBeDisabled, …) for
// the component/hook tests. Harmless for the node-env pure tests, which
// simply never call them.
expect.extend(matchers);
