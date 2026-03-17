#!/usr/bin/env node

/**
 * Test script for vibe-model using Copilot SDK
 *
 * This script creates a Copilot session and runs a simple test
 * to validate that vibe-model works with Copilot.
 */

const { Copilot } = require('@github/copilot-sdk');
const fs = require('fs');
const path = require('path');

const TEST_TIMEOUT = 300000; // 5 minutes
const SIMPLE_TEST_PROMPT = 'Create a simple hello world program in C++ using CMake';

console.log('🚀 Starting vibe-model test with Copilot SDK');
console.log('📝 Test prompt:', SIMPLE_TEST_PROMPT);

async function runTest() {
  const startTime = Date.now();

  try {
    // Initialize Copilot
    const copilot = new Copilot({
      token: process.env.GITHUB_TOKEN,
    });

    console.log('✅ Copilot SDK initialized');

    // Create a session
    const session = await copilot.session.create();
    console.log('✅ Copilot session created:', session.id);

    // Prepare test environment
    const testDir = path.join(process.cwd(), '.test-output');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    console.log('📂 Test directory created:', testDir);

    // Run the test with timeout
    console.log('⏳ Running test (timeout: 5 minutes)...');

    const testPromise = copilot.chat.complete({
      session: session.id,
      prompt: SIMPLE_TEST_PROMPT,
      stream: false,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timed out after 5 minutes')), TEST_TIMEOUT);
    });

    const result = await Promise.race([testPromise, timeoutPromise]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Test completed in ${duration}s`);

    // Validate output
    if (result && result.content) {
      console.log('📄 Generated content length:', result.content.length);

      // Save output for inspection
      const outputFile = path.join(testDir, 'copilot-response.md');
      fs.writeFileSync(outputFile, result.content);
      console.log('💾 Response saved to:', outputFile);

      // Basic validation
      const hasCMake = result.content.toLowerCase().includes('cmake');
      const hasCpp = result.content.toLowerCase().includes('c++') || result.content.includes('.cpp');

      if (hasCMake && hasCpp) {
        console.log('✅ Validation passed: Content includes CMake and C++ references');
      } else {
        console.log('⚠️  Warning: Content may be incomplete');
      }
    } else {
      throw new Error('No content generated');
    }

    // Cleanup session
    await copilot.session.delete(session.id);
    console.log('🧹 Session cleaned up');

    console.log('\n✨ Test completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Session ID: ${session.id}`);
    console.log(`  - Content length: ${result.content.length} chars`);
    console.log(`  - Output file: ${outputFile}`);

    return {
      success: true,
      duration,
      sessionId: session.id,
      contentLength: result.content.length,
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('\n❌ Test failed after', duration, 'seconds');
    console.error('Error:', error.message);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    return {
      success: false,
      error: error.message,
      duration,
    };
  }
}

// Run the test
runTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
