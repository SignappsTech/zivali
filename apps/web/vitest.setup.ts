import { configure } from '@testing-library/react';

// findBy*/waitFor default to 1 s, which jsdom misses on a loaded machine (testTimeout alone does not cover them).
configure({ asyncUtilTimeout: 10_000 });
