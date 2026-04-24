import { BigQuery } from '@google-cloud/bigquery';
import {
  getGoogleCredentialsPath,
  getGoogleProjectId,
  isBigQueryAvailable,
} from './envAvailability.js';

let bigquery;

/**
 * Initializes and returns a singleton BigQuery client instance.
 * It relies on Google Cloud's Application Default Credentials (ADC) strategy.
 * Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set to the path of your service account key file.
 * @returns {BigQuery} The BigQuery client instance.
 */
function getClient() {
  if (bigquery) {
    return bigquery;
  }

  if (!isBigQueryAvailable()) {
    return null;
  }

  try {
    const clientOptions = {
      projectId: getGoogleProjectId(),
    };

    const credentialsPath = getGoogleCredentialsPath();
    if (credentialsPath) {
      clientOptions.keyFilename = credentialsPath;
    }

    bigquery = new BigQuery(clientOptions);
    console.log('BigQuery client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize BigQuery client. Ensure ADC are configured.', error);
    bigquery = null;
  }

  return bigquery;
}

/**
 * Runs a mock analysis query against BigQuery.
 * In a real-world scenario, this query would be complex and operate on a specified table.
 * This example demonstrates running a query that generates mock metrics.
 *
 * @param {Array<{name: string, type: string}>} schema - The schema of the dataset to be analyzed.
 * @param {boolean} privacySafeMode - Flag to determine if privacy-safe transformations should be applied.
 * @returns {Promise<object>} An object containing the analysis results.
 */
async function runAnalysisQuery(schema, privacySafeMode) {
  const bqClient = getClient();

  // Identify sensitive attributes from the provided schema
  const sensitiveAttributes = schema
    .map(field => field.name)
    .filter(name => ['gender', 'race', 'age', 'ethnicity'].includes(name.toLowerCase()));

  if (sensitiveAttributes.length === 0) {
    return {
        fairnessScore: 1.0,
        biasMetrics: [],
        sensitiveAttributes: [],
        recordsAnalyzed: 0,
        source: 'mock',
    };
  }

  if (!bqClient) {
    return buildMockAnalysis(sensitiveAttributes, privacySafeMode);
  }

  // Dynamically build a query to generate mock bias metrics for each sensitive attribute.
  // In a real application, this would be a sophisticated query on your actual data table.
  const subqueries = sensitiveAttributes.map(attr => `
    SELECT
      '${attr}' AS attribute,
      ['Group A', 'Group B', 'Group C'] AS groups,
      [
        ROUND(${privacySafeMode ? 'SAFE_CAST(RAND() * 0.4 + 0.1 AS NUMERIC)' : 'RAND() * 0.4 + 0.1'}, 4),
        ROUND(${privacySafeMode ? 'SAFE_CAST(RAND() * 0.4 + 0.1 AS NUMERIC)' : 'RAND() * 0.4 + 0.1'}, 4),
        ROUND(${privacySafeMode ? 'SAFE_CAST(RAND() * 0.2 AS NUMERIC)' : 'RAND() * 0.2'}, 4)
      ] AS values
  `);

  const queryString = subqueries.join(' UNION ALL ');

  const options = {
    query: queryString,
    // Location must match that of the dataset(s) referenced in the query.
    // Since this is a mock query, we can use a default like 'US'.
    location: 'US',
  };

  // Run the query
  try {
    const [rows] = await bqClient.query(options);

    const biasMetrics = rows.map(row => ({
        attribute: row.attribute,
        metrics: row.groups.map((name, index) => ({
            name,
            value: row.values[index]
        }))
    }));

    return {
      fairnessScore: Math.random() * 0.2 + 0.78,
      biasMetrics,
      sensitiveAttributes,
      recordsAnalyzed: Math.floor(Math.random() * 1200) + 600,
      source: 'bigquery',
    };
  } catch (error) {
    console.error('BigQuery query failed, falling back to mock analysis.', error);
    return buildMockAnalysis(sensitiveAttributes, privacySafeMode);
  }
}

function buildMockAnalysis(sensitiveAttributes, privacySafeMode) {
  const noise = privacySafeMode ? 0.05 : 0.12;

  const biasMetrics = sensitiveAttributes.map((attribute, index) => {
    const base = 0.12 + index * 0.04;
    return {
      attribute,
      metrics: [
        { name: 'Group A', value: Number((base + noise).toFixed(4)) },
        { name: 'Group B', value: Number((base + noise * 0.6).toFixed(4)) },
        { name: 'Group C', value: Number((Math.max(0.04, base - noise * 0.35)).toFixed(4)) },
      ],
    };
  });

  return {
    fairnessScore: Number((0.76 + Math.random() * 0.15).toFixed(4)),
    biasMetrics,
    sensitiveAttributes,
    recordsAnalyzed: Math.floor(Math.random() * 800) + 400,
    source: 'mock',
  };
}

export { getClient, runAnalysisQuery };
