#!/usr/bin/env node

/**
 * Publish script for the Dataform Plugin
 * This script helps with the publishing process to npm
 */

const { execSync } = require('child_process')
const fs = require('fs')

function runCommand(command, description) {
  console.log(`\n${description}...`)
  try {
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${description} completed successfully`)
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    process.exit(1)
  }
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...')

  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found')
    process.exit(1)
  }

  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' })
  } catch (error) {
    console.error('❌ Not in a git repository')
    process.exit(1)
  }

  // Check if npm is logged in
  try {
    execSync('npm whoami', { stdio: 'ignore' })
  } catch (error) {
    console.error('❌ Not logged in to npm. Run "npm login" first.')
    process.exit(1)
  }

  console.log('✅ Prerequisites check passed')
}

function main() {
  console.log('🚀 Starting publish process for Dataform Plugin')

  checkPrerequisites()

  // Run tests
  runCommand('npm test', 'Running tests')

  // Run linting
  runCommand('npm run lint', 'Running linting')

  // Check git status
  runCommand('git status --porcelain', 'Checking git status')

  const hasChanges = execSync('git status --porcelain').toString().trim()
  if (hasChanges) {
    console.log('⚠️  You have uncommitted changes. Please commit them before publishing.')
    console.log('Uncommitted changes:')
    execSync('git status --short', { stdio: 'inherit' })
    process.exit(1)
  }

  // Get current version
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const currentVersion = packageJson.version

  console.log(`\n📦 Current version: ${currentVersion}`)
  console.log('📤 Publishing to npm...')

  // Publish to npm
  runCommand('npm publish', 'Publishing package')

  console.log(`\n🎉 Successfully published ${packageJson.name}@${currentVersion}`)
  console.log(`📋 You can install it with: npm install ${packageJson.name}`)
}

if (require.main === module) {
  main()
}
