<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { OrchestrationCenter, FlowExplorer, ActivityStream, PerformancePulse } from '$lib/components/ui/enhanced-bits';
	
	let { data }: { data: PageData } = $props();
	
	let activeTab = $state('overview');
	let selectedAnalysisType = $state(data.analysisType);
	let isAnalyzing = $state(false);
	let analysisProgress = $state(0);
	
	let tabs = $derived([
		{ id: 'overview', label: 'Case Overview', count: 1 },
		{ id: 'analysis', label: 'AI Analysis', count: data.analysisResults.comprehensive.key_issues.length },
		{ id: 'documents', label: 'Document Analysis', count: data.analysisResults.document_analysis.total_documents },
		{ id: 'financial', label: 'Financial Analysis', count: 4 },
		{ id: 'insights', label: 'AI Insights', count: data.aiInsights.strategy_recommendations.length },
		{ id: 'activity', label: 'Recent Activity', count: data.recentActivity.length }
	]);

	let winProbabilityColor = $derived(
		data.analysisResults.comprehensive.win_probability > 0.75 ? 'text-green-600' :
		data.analysisResults.comprehensive.win_probability > 0.5 ? 'text-yellow-600' : 'text-red-600'
	);

	let riskAssessmentColor = $derived(
		data.analysisResults.comprehensive.risk_assessment === 'low' ? 'text-green-600' :
		data.analysisResults.comprehensive.risk_assessment === 'medium' ? 'text-yellow-600' : 'text-red-600'
	);

	function startNewAnalysis() {
		isAnalyzing = true;
		analysisProgress = 0;
		
		const interval = setInterval(() => {
			analysisProgress += Math.random() * 15;
			if (analysisProgress >= 100) {
				analysisProgress = 100;
				isAnalyzing = false;
				clearInterval(interval);
			}
		}, 200);
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatPercentage(value: number): string {
		return `${Math.round(value * 100)}%`;
	}

	function getConfidenceColor(confidence: number): string {
		return confidence > 0.8 ? 'text-green-600' : 
			   confidence > 0.6 ? 'text-yellow-600' : 'text-red-600';
	}

	function getRiskLevelColor(level: string): string {
		return level === 'low' ? 'text-green-600' :
			   level === 'medium' ? 'text-yellow-600' : 'text-red-600';
	}

	function getPriorityColor(priority: string): string {
		return priority === 'high' ? 'text-red-600' :
			   priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
	}
</script>

<div class="container mx-auto p-6 space-y-6">
	<div class="flex justify-between items-start">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{data.caseDetails.title}</h1>
			<p class="text-lg text-gray-600 mt-2">Case ID: {data.caseDetails.id}</p>
			<div class="flex items-center gap-4 mt-4">
				<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
					{data.caseDetails.status}
				</span>
				<span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
					{data.caseDetails.priority}
				</span>
				<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
					{data.caseDetails.practiceArea}
				</span>
			</div>
		</div>
		
		<div class="text-right">
			<div class="text-sm text-gray-500">AI Confidence</div>
			<div class="text-2xl font-bold {getConfidenceColor(data.caseDetails.confidence_score)}">
				{formatPercentage(data.caseDetails.confidence_score)}
			</div>
		</div>
	</div>

	<OrchestrationCenter>
		<FlowExplorer {tabs} bind:activeTab>
			{#snippet tabContent()}
				{#if activeTab === 'overview'}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h3 class="text-lg font-semibold text-gray-900 mb-4">Case Details</h3>
							<div class="space-y-3">
								<div><span class="font-medium">Client:</span> {data.caseDetails.client}</div>
								<div><span class="font-medium">Case Type:</span> {data.caseDetails.caseType}</div>
								<div><span class="font-medium">Jurisdiction:</span> {data.caseDetails.jurisdiction}</div>
								<div><span class="font-medium">Estimated Value:</span> {formatCurrency(data.caseDetails.estimated_value)}</div>
								<div><span class="font-medium">Created:</span> {data.caseDetails.dateCreated}</div>
								<div><span class="font-medium">Last Modified:</span> {data.caseDetails.lastModified}</div>
							</div>
						</div>

						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h3 class="text-lg font-semibold text-gray-900 mb-4">Legal Team</h3>
							<div class="space-y-3">
								{#each data.caseDetails.assignedLawyers as lawyer}
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
											{lawyer.split(' ').map(n => n[0]).join('')}
										</div>
										<span>{lawyer}</span>
									</div>
								{/each}
							</div>
						</div>

						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h3 class="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
							<div class="space-y-3">
								<div>
									<span class="font-medium">Win Probability:</span> 
									<span class="font-bold {winProbabilityColor}">
										{formatPercentage(data.analysisResults.comprehensive.win_probability)}
									</span>
								</div>
								<div>
									<span class="font-medium">Risk Assessment:</span> 
									<span class="font-bold {riskAssessmentColor} capitalize">
										{data.analysisResults.comprehensive.risk_assessment}
									</span>
								</div>
								<div>
									<span class="font-medium">Legal Strength:</span> 
									<span class="font-bold text-blue-600">
										{formatPercentage(data.analysisResults.comprehensive.legal_strength)}
									</span>
								</div>
							</div>
						</div>
					</div>
				{:else if activeTab === 'analysis'}
					<div class="space-y-6">
						<div class="flex justify-between items-center">
							<h3 class="text-xl font-semibold text-gray-900">AI Analysis Results</h3>
							<button 
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
								onclick={startNewAnalysis}
								disabled={isAnalyzing}
							>
								{isAnalyzing ? 'Analyzing...' : 'Rerun Analysis'}
							</button>
						</div>

						{#if isAnalyzing}
							<div class="bg-blue-50 p-4 rounded-lg">
								<div class="flex items-center justify-between mb-2">
									<span class="text-blue-800 font-medium">Analysis in Progress</span>
									<span class="text-blue-600">{Math.round(analysisProgress)}%</span>
								</div>
								<div class="w-full bg-blue-200 rounded-full h-2">
									<div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {analysisProgress}%"></div>
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">Key Issues Identified</h4>
								<div class="space-y-3">
									{#each data.analysisResults.comprehensive.key_issues as issue, index}
										<div class="flex items-start gap-3">
											<div class="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium">
												{index + 1}
											</div>
											<span class="text-gray-700">{issue}</span>
										</div>
									{/each}
								</div>
							</div>

							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">Timeline Predictions</h4>
								<div class="space-y-3">
									{#each Object.entries(data.analysisResults.comprehensive.timeline_prediction) as [phase, duration]}
										<div class="flex justify-between">
											<span class="capitalize text-gray-700">{phase.replace('_', ' ')}:</span>
											<span class="font-medium">{duration}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>

						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h4 class="text-lg font-semibold text-gray-900 mb-4">Similar Cases</h4>
							<div class="overflow-x-auto">
								<table class="min-w-full">
									<thead>
										<tr class="border-b">
											<th class="text-left py-2">Case ID</th>
											<th class="text-left py-2">Similarity</th>
											<th class="text-left py-2">Outcome</th>
											<th class="text-left py-2">Settlement</th>
										</tr>
									</thead>
									<tbody>
										{#each data.analysisResults.comprehensive.similar_cases as case}
											<tr class="border-b">
												<td class="py-2">{case.id}</td>
												<td class="py-2">
													<span class="font-medium text-green-600">
														{formatPercentage(case.similarity)}
													</span>
												</td>
												<td class="py-2">
													<span class="px-2 py-1 text-xs rounded-full {
														case.outcome === 'Plaintiff Victory' ? 'bg-green-100 text-green-800' :
														case.outcome === 'Settlement' ? 'bg-yellow-100 text-yellow-800' :
														'bg-red-100 text-red-800'
													}">
														{case.outcome}
													</span>
												</td>
												<td class="py-2">{case.settlement > 0 ? formatCurrency(case.settlement) : 'N/A'}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				{:else if activeTab === 'documents'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
								<div class="text-3xl font-bold text-blue-600">{data.analysisResults.document_analysis.total_documents}</div>
								<div class="text-gray-600">Total Documents</div>
							</div>
							<div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
								<div class="text-3xl font-bold text-green-600">{data.analysisResults.document_analysis.processed_documents}</div>
								<div class="text-gray-600">Processed</div>
							</div>
							<div class="bg-white p-6 rounded-lg border border-gray-200 text-center">
								<div class="text-3xl font-bold text-yellow-600">
									{formatPercentage(data.analysisResults.document_analysis.processed_documents / data.analysisResults.document_analysis.total_documents)}
								</div>
								<div class="text-gray-600">Completion Rate</div>
							</div>
						</div>

						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h4 class="text-lg font-semibold text-gray-900 mb-4">Key Documents</h4>
							<div class="overflow-x-auto">
								<table class="min-w-full">
									<thead>
										<tr class="border-b">
											<th class="text-left py-2">Document Name</th>
											<th class="text-left py-2">Relevance</th>
											<th class="text-left py-2">Risk Level</th>
										</tr>
									</thead>
									<tbody>
										{#each data.analysisResults.document_analysis.key_documents as doc}
											<tr class="border-b">
												<td class="py-2 font-medium">{doc.name}</td>
												<td class="py-2">
													<span class="font-medium text-blue-600">
														{formatPercentage(doc.relevance)}
													</span>
												</td>
												<td class="py-2">
													<span class="px-2 py-1 text-xs rounded-full capitalize {getRiskLevelColor(doc.risk_level)} bg-opacity-10">
														{doc.risk_level}
													</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h4 class="text-lg font-semibold text-gray-900 mb-4">Extraction Metrics</h4>
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
								{#each Object.entries(data.analysisResults.document_analysis.extraction_metrics) as [metric, count]}
									<div class="text-center">
										<div class="text-2xl font-bold text-gray-900">{count}</div>
										<div class="text-sm text-gray-600 capitalize">{metric.replace('_', ' ')}</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if activeTab === 'financial'}
					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">Damages Analysis</h4>
								<div class="space-y-3">
									<div class="flex justify-between">
										<span class="text-gray-600">Claimed:</span>
										<span class="font-bold">{formatCurrency(data.analysisResults.financial_analysis.claimed_damages)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-600">Estimated Actual:</span>
										<span class="font-bold text-green-600">{formatCurrency(data.analysisResults.financial_analysis.estimated_actual_damages)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-600">Litigation Costs:</span>
										<span class="font-bold text-red-600">{formatCurrency(data.analysisResults.financial_analysis.litigation_costs)}</span>
									</div>
								</div>
							</div>

							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">Settlement Range</h4>
								<div class="space-y-3">
									<div class="flex justify-between">
										<span class="text-gray-600">Minimum:</span>
										<span class="font-bold text-red-600">{formatCurrency(data.analysisResults.financial_analysis.settlement_range.min)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-600">Optimal:</span>
										<span class="font-bold text-blue-600">{formatCurrency(data.analysisResults.financial_analysis.settlement_range.optimal)}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-600">Maximum:</span>
										<span class="font-bold text-green-600">{formatCurrency(data.analysisResults.financial_analysis.settlement_range.max)}</span>
									</div>
								</div>
							</div>

							<div class="bg-white p-6 rounded-lg border border-gray-200">
								<h4 class="text-lg font-semibold text-gray-900 mb-4">ROI Analysis</h4>
								<div class="space-y-3">
									{#each Object.entries(data.analysisResults.financial_analysis.roi_analysis) as [strategy, roi]}
										<div class="flex justify-between">
											<span class="text-gray-600 capitalize">{strategy.replace('_', ' ')}:</span>
											<span class="font-bold {getConfidenceColor(roi)}">{formatPercentage(roi)}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>

						<div class="bg-blue-50 p-6 rounded-lg border border-blue-200">
							<h4 class="text-lg font-semibold text-blue-900 mb-2">Recommended Strategy</h4>
							<p class="text-blue-800">
								Based on ROI analysis, <strong>early mediation</strong> provides the highest return at 85% ROI. 
								This approach minimizes litigation costs while maximizing potential settlement value.
							</p>
						</div>
					</div>
				{:else if activeTab === 'insights'}
					<div class="space-y-6">
						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h4 class="text-lg font-semibold text-gray-900 mb-4">AI Strategy Recommendations</h4>
							<div class="space-y-4">
								{#each data.aiInsights.strategy_recommendations as rec}
									<div class="border-l-4 {getPriorityColor(rec.priority)} border-opacity-50 pl-4 py-2">
										<div class="flex justify-between items-start mb-2">
											<span class="px-2 py-1 text-xs rounded-full capitalize {getPriorityColor(rec.priority)} bg-opacity-10">
												{rec.priority} Priority
											</span>
											<span class="text-sm {getConfidenceColor(rec.confidence)}">
												{formatPercentage(rec.confidence)} confidence
											</span>
										</div>
										<h5 class="font-medium text-gray-900 mb-2">{rec.recommendation}</h5>
										<p class="text-gray-600 text-sm">{rec.reasoning}</p>
									</div>
								{/each}
							</div>
						</div>

						<div class="bg-white p-6 rounded-lg border border-gray-200">
							<h4 class="text-lg font-semibold text-gray-900 mb-4">Risk Factors</h4>
							<div class="space-y-4">
								{#each data.aiInsights.risk_factors as risk}
									<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
										<div>
											<span class="font-medium text-gray-900">{risk.factor}</span>
											<span class="ml-2 px-2 py-1 text-xs rounded-full capitalize {
												risk.impact === 'high' ? 'bg-red-100 text-red-800' :
												risk.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
												'bg-green-100 text-green-800'
											}">
												{risk.impact} impact
											</span>
										</div>
										<div class="text-right">
											<div class="font-medium {getConfidenceColor(risk.probability)}">
												{formatPercentage(risk.probability)}
											</div>
											<div class="text-xs text-gray-500">probability</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if activeTab === 'activity'}
					<ActivityStream>
						{#snippet streamItems()}
							{#each data.recentActivity as activity}
								<div class="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200">
									<div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
										{activity.user === 'AI System' ? 'AI' : activity.user.split(' ').map(n => n[0]).join('')}
									</div>
									<div class="flex-1">
										<div class="font-medium text-gray-900">{activity.action}</div>
										<div class="text-sm text-gray-600">by {activity.user}</div>
										<div class="text-xs text-gray-500 mt-1">
											{new Date(activity.timestamp).toLocaleString()}
										</div>
									</div>
								</div>
							{/each}
						{/snippet}
					</ActivityStream>
				{/if}
			{/snippet}
		</FlowExplorer>

		<PerformancePulse>
			{#snippet metrics()}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold text-green-600">{formatPercentage(data.caseDetails.confidence_score)}</div>
						<div class="text-sm text-gray-600">AI Confidence</div>
					</div>
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold text-blue-600">{formatPercentage(data.analysisResults.comprehensive.win_probability)}</div>
						<div class="text-sm text-gray-600">Win Probability</div>
					</div>
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold text-yellow-600">{formatCurrency(data.analysisResults.comprehensive.settlement_recommendation)}</div>
						<div class="text-sm text-gray-600">Settlement Rec.</div>
					</div>
					<div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
						<div class="text-2xl font-bold text-purple-600">{data.analysisResults.document_analysis.processed_documents}</div>
						<div class="text-sm text-gray-600">Docs Processed</div>
					</div>
				</div>
			{/snippet}
		</PerformancePulse>
	</OrchestrationCenter>
</div>