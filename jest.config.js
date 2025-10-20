module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text'],
  testMatch: [
    '**/test/**/*.test.js'
  ]
}
