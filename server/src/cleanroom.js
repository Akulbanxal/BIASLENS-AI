import { Router } from 'express';
import { analyzeCleanroomDataset } from './services/cleanroomBiasService.js';
import { runAnalysisQuery } from './services/bigqueryService.js';
import { getBigQueryStatus, isBigQueryAvailable } from './services/envAvailability.js';
import { systemMetrics } from './services/systemMetrics.js';
import { alertService } from './services/alertService.js';
import { safetyService } from './services/safetyService.js';
import { mitigateBias } from './services/biasMitigationService.js';

const router = Router();

const summarizeExplainability = (analysisResults) => {
    const groupStats = Array.isArray(analysisResults?.groupStats) ? analysisResults.groupStats : [];

    if (groupStats.length === 0) {
        return {
            whyBiasOccurred: 'No sensitive-group deltas were available in this analysis run.',
            responsibleFeature: 'N/A',
        };
    }

    const top = [...groupStats].sort((a, b) => (b.biasScore || 0) - (a.biasScore || 0))[0];
    const sortedGroups = [...(top.groups || [])].sort((a, b) => (b.approvalRate || 0) - (a.approvalRate || 0));
    const highest = sortedGroups[0];
    const lowest = sortedGroups[sortedGroups.length - 1];
    const gap = Math.max(0, (highest?.approvalRate || 0) - (lowest?.approvalRate || 0));

    return {
        whyBiasOccurred: `Approval rates diverged by ${(gap * 100).toFixed(1)}% between ${highest?.group || 'top group'} and ${lowest?.group || 'lowest group'} for ${top.attribute}.`,
        responsibleFeature: top.attribute,
    };
};

// Mock dataset sample
const mockDataset = [
    { id: 1, age: 34, gender: 'Male', income: 68000, loan_approved: 1, risk_score: 0.21 },
    { id: 2, age: 45, gender: 'Female', income: 82000, loan_approved: 1, risk_score: 0.15 },
    { id: 3, age: 28, gender: 'Female', income: 45000, loan_approved: 0, risk_score: 0.65 },
    { id: 4, age: 52, gender: 'Male', income: 120000, loan_approved: 1, risk_score: 0.08 },
    { id: 5, age: 31, gender: 'Male', income: 55000, loan_approved: 0, risk_score: 0.48 },
    { id: 6, age: 39, gender: 'Female', income: 71000, loan_approved: 1, risk_score: 0.25 },
    { id: 7, age: 25, gender: 'Male', income: 48000, loan_approved: 0, risk_score: 0.59 },
    { id: 8, age: 61, gender: 'Female', income: 95000, loan_approved: 1, risk_score: 0.11 },
];

// GET /api/cleanroom/sample - Return a mock dataset
router.get('/sample', (req, res) => {
    systemMetrics.incrementRecordsAnalyzed(mockDataset.length);
        const bigQueryStatus = getBigQueryStatus();

  res.json({
    data: mockDataset,
    schema: Object.keys(mockDataset[0]).map(key => ({
        name: key,
        type: typeof mockDataset[0][key] === 'number' ? 'NUMERIC' : 'STRING'
    })),
    meta: {
                bigQueryAvailable: bigQueryStatus.available,
                cloudSetupHint: bigQueryStatus.setupHint,
    }
  });
});

// POST /api/cleanroom/analyze - Run analysis using either local or cloud logic
router.post('/analyze', async (req, res) => {
    const { schema, privacySafeMode, dataset, analysisMode = 'local' } = req.body;

    if (!schema || !Array.isArray(schema)) {
        return res.status(400).json({ error: 'Invalid schema provided.' });
    }

    try {
        let analysisResults;
        let provider;
        let killSwitchMeta = null;

        const safetyStatus = safetyService.getStatus();

        if (safetyStatus.status === 'TRIGGERED' && Array.isArray(dataset) && dataset.length > 0) {
            const selectedFeature = safetyStatus.activeIncident?.responsibleFeature || 'gender';
            const mitigation = mitigateBias({
                dataset,
                schema,
                selectedFeature,
                privacySafeMode,
            });

            analysisResults = analyzeCleanroomDataset({
                schema,
                dataset: mitigation.mitigatedDataset,
                privacySafeMode,
            });

            provider = 'kill-switch-guard';
            killSwitchMeta = {
                active: true,
                strategyUsed: mitigation.strategyUsed,
                explanation: mitigation.explanation,
                before: mitigation.before,
                after: mitigation.after,
            };
        } else if (analysisMode === 'cloud') {

            if (isBigQueryAvailable()) {
                // NOTE: BigQuery analysis is currently a mock.
                // In a real implementation, you would pass the dataset to BigQuery.
                analysisResults = await runAnalysisQuery(schema, privacySafeMode);
                provider = 'bigquery';
            } else {
                if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
                    return res.status(400).json({ error: 'Dataset is required when Cloud Mode falls back to local analysis.' });
                }
                analysisResults = analyzeCleanroomDataset({
                    schema,
                    dataset,
                    privacySafeMode,
                });
                provider = 'local-fallback';
            }
        } else {
            // Local JS-based analysis
            if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
                return res.status(400).json({ error: 'Dataset is required for local analysis.' });
            }
            analysisResults = analyzeCleanroomDataset({
                schema,
                dataset,
                privacySafeMode,
            });
            provider = 'local';
        }

        systemMetrics.incrementAnalysesRun(1);
        systemMetrics.incrementRecordsAnalyzed(analysisResults.recordsAnalyzed || dataset?.length || 0);
        systemMetrics.emit({
            type: 'analysis',
            payload: {
                source: 'cleanroom',
                fairnessScore: analysisResults.fairnessScore,
                biasScore: analysisResults.biasScore,
                timestamp: new Date().toISOString(),
            },
        });

        const safetyResult = safetyService.observeEvent({
            source: 'cleanroom',
            fairnessScore: analysisResults.fairnessScore,
            biasScore: analysisResults.biasScore,
            responsibleFeature: analysisResults.flaggedAttributes?.[0] || 'multiple',
            timestamp: new Date().toISOString(),
        });

        if (safetyResult.triggered) {
            systemMetrics.emit({
                type: 'safety',
                payload: {
                    mode: 'TRIGGERED',
                    source: 'cleanroom',
                    incidentId: safetyResult.incident?.id,
                    reason: safetyResult.incident?.reason,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const explainability = summarizeExplainability(analysisResults);
        const generatedAlerts = alertService.recordAnalysis({
            ...analysisResults,
            primaryFeature: explainability.responsibleFeature,
        });

        res.json({
            analysisId: `analysis_${Date.now()}`,
            ...analysisResults,
            privacySafeMode,
            explainability,
            meta: {
                provider,
                analysisMode: provider === 'bigquery' ? 'cloud' : 'local',
                modeLabel: provider === 'bigquery' ? 'Cloud Mode' : 'Local Mode',
                demoMode: !isBigQueryAvailable(),
                killSwitch: safetyService.getStatus().status,
            },
            alerts: generatedAlerts,
            killSwitch: killSwitchMeta,
        });
    } catch (error) {
        console.error(`Cleanroom analysis failed (mode: ${analysisMode}):`, error);
        res.status(500).json({ error: 'Failed to perform analysis.', details: error.message });
    }
});

export default router;
