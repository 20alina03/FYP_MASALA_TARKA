module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/mocks.js',
    '<rootDir>/tests/setup/db.js',
  ],
  clearMocks: true,
};
