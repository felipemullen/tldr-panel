/** @type {import('jest').Config} */
module.exports = {
    clearMocks: true,
    testPathIgnorePatterns: [
        '<rootDir>/__tests__/suite',
        '<rootDir>/__tests__/runTest.ts'
    ],
    testMatch: [
        '<rootDir>/__tests__/**/*.test.ts'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    }
};