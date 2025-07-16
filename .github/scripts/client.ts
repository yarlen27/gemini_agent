#!/usr/bin/env node

import * as https from 'https';
import { URL } from 'url';

// Environment variables from GitHub Actions
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ISSUE_TITLE = process.env.ISSUE_TITLE || '';
const ISSUE_BODY = process.env.ISSUE_BODY || '';
const ISSUE_NUMBER = process.env.ISSUE_NUMBER || '';
const GEMINI_AGENT_API_URL = process.env.GEMINI_AGENT_API_URL || 'https://gemini.27cobalto.com';
const INITIAL_COMMENT_ID = process.env.INITIAL_COMMENT_ID || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'yarlen27/gemini_agent';

// Logging functions
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const error = (message: string) => {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
};

// Main function
async function main() {
  log('--- Gemini Agent Client Started ---');
  log(`Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}`);
  log(`API URL: ${GEMINI_AGENT_API_URL}`);
  log(`Comment ID: ${INITIAL_COMMENT_ID}`);

  // Validate required environment variables
  if (!GITHUB_TOKEN || !ISSUE_NUMBER || !ISSUE_TITLE || !ISSUE_BODY) {
    error('Missing required environment variables');
    process.exit(1);
  }

  // Prepare webhook payload
  const payload = {
    issue_number: ISSUE_NUMBER,
    issue_title: ISSUE_TITLE,
    issue_body: ISSUE_BODY,
    repo: GITHUB_REPOSITORY,
    github_token: GITHUB_TOKEN,
    comment_id: INITIAL_COMMENT_ID || null
  };

  log(`Sending webhook request...`);
  log(`Payload: ${JSON.stringify(payload, null, 2)}`);

  try {
    const response = await makeHttpsRequest(
      `${GEMINI_AGENT_API_URL}/v1/github/webhook`,
      'POST',
      payload
    );

    log(`Response received: ${JSON.stringify(response, null, 2)}`);

    if (response.success) {
      log(`✅ Task completed successfully!`);
      log(`PR Link: ${response.pr_link}`);
      log(`Message: ${response.message}`);
    } else {
      error(`Task failed: ${response.error}`);
      process.exit(1);
    }

  } catch (err) {
    error(`Failed to communicate with server: ${err}`);
    process.exit(1);
  }

  log('--- Gemini Agent Client Finished ---');
}

// HTTPS request helper
function makeHttpsRequest(url: string, method: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Run the main function
main().catch((err) => {
  error(`Unhandled error: ${err}`);
  process.exit(1);
});