
import type { RequestEvent } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types.js';
import { URL } from "url";


// Document templates with pre-filled content
const documentTemplates = {
  brief: {
    title: "Criminal Case Brief",
    content: `# Criminal Case Brief

## Case Overview
[Case Name] v. [Defendant Name]
Case Number: [Case Number]
Court: [Court Name]
Date: [Date]

## Facts
[Describe the factual background of the case, including what allegedly happened, when, where, and involving whom]

## Legal Issues
1. [Primary legal issue]
2. [Secondary legal issue]
3. [Additional issues as needed]

## Analysis
### Issue 1: [Legal Issue]
[Analyze the law and apply it to the facts]

### Issue 2: [Legal Issue]
[Analyze the law and apply it to the facts]

## Conclusion
[Summarize your legal conclusions and recommendations]

## Citations
[List all legal authorities cited in the brief]
`,
    documentType: "brief",
    tags: ["brief", "criminal", "template"],
    citations: [],
  },
  motion: {
    title: "Motion to [Action]",
    content: `# Motion to [Action]

## Introduction
[Defendant/Plaintiff] respectfully moves this Court to [specific action requested] on the grounds that [brief reason].

## Statement of Facts
[Provide relevant factual background in chronological order]

## Legal Argument
### I. [Primary Legal Argument]
[State the legal principle and cite relevant authority]

[Apply the law to the facts of this case]

### II. [Secondary Legal Argument]
[State the legal principle and cite relevant authority]

[Apply the law to the facts of this case]

## Conclusion
For the foregoing reasons, [Defendant/Plaintiff] respectfully requests that this Court [specific relief requested].

Respectfully submitted,
[Attorney Name]
[Attorney Title]
[Bar Number]
[Contact Information]
`,
    documentType: "motion",
    tags: ["motion", "template"],
    citations: [],
  },
  contract: {
    title: "Legal Contract",
    content: `# [Contract Title]

**Parties:** This agreement is entered into between [Party 1 Name] ("[Party 1 Short Name]") and [Party 2 Name] ("[Party 2 Short Name]").

**Date:** [Date]

## Terms and Conditions

### 1. Purpose
[Describe the purpose of the contract]

### 2. Obligations
**[Party 1 Short Name] agrees to:**
- [Obligation 1]
- [Obligation 2]

**[Party 2 Short Name] agrees to:**
- [Obligation 1]
- [Obligation 2]

### 3. Consideration
[Describe what each party is giving/receiving]

### 4. Duration
[Specify the duration of the contract]

### 5. Termination
[Describe how the contract can be terminated]

### 6. Dispute Resolution
[Specify how disputes will be resolved]

### 7. Governing Law
This contract shall be governed by the laws of [Jurisdiction].

## Signatures
**[Party 1 Name]**
Signature: _________________________ Date: __________

**[Party 2 Name]**
Signature: _________________________ Date: __________
`,
    documentType: "contract",
    tags: ["contract", "template"],
    citations: [],
  },
  evidence: {
    title: "Evidence Analysis Report",
    content: `# Evidence Analysis Report

## Case Information
Case Number: [Case Number]
Date of Analysis: [Date]
Analyst: [Analyst Name]

## Executive Summary
[Brief overview of the evidence and key findings]

## Evidence Inventory
| Item # | Description | Source | Date Collected |
|--------|-------------|---------|----------------|
| [#] | [Description] | [Source] | [Date] |

## Analysis Results
### Physical Evidence
[Describe analysis of physical evidence]

### Digital Evidence
[Describe analysis of digital evidence]

### Documentary Evidence
[Describe analysis of documents]

## Chain of Custody
[Document the chain of custody for all evidence]

## Conclusions
[Summarize findings and their significance to the case]

## Recommendations
[Provide recommendations for further investigation or action]

## Appendices
- Appendix A: [Supporting documentation]
- Appendix B: [Additional materials]
`,
    documentType: "evidence",
    tags: ["evidence", "analysis", "template"],
    citations: [],
  },
  memo: {
    title: "Legal Memorandum",
    content: `# Legal Memorandum

**TO:** [Recipient]
**FROM:** [Your Name]
**DATE:** [Date]
**RE:** [Subject Matter]

## Question Presented
[State the legal question in one sentence]

## Brief Answer
[Provide a concise answer to the question]

## Facts
[Describe the relevant facts]

## Discussion
### I. [Legal Issue 1]
[Analyze the first legal issue]

### II. [Legal Issue 2]
[Analyze the second legal issue]

## Conclusion
[Summarize your analysis and provide recommendations]
`,
    documentType: "memo",
    tags: ["memo", "memorandum", "template"],
    citations: [],
  },
  pleading: {
    title: "Legal Pleading",
    content: `# [Type of Pleading]

**IN THE [COURT NAME]**
**[JURISDICTION]**

[PLAINTIFF NAME],
                    Plaintiff,
v.                                           Case No. [CASE NUMBER]
[DEFENDANT NAME],
                    Defendant.

## [Type of Pleading]

TO THE HONORABLE COURT:

[PARTY NAME], by and through undersigned counsel, respectfully submits this [Type of Pleading] and states as follows:

## I. PARTIES
[Identify the parties]

## II. JURISDICTION AND VENUE
[Establish jurisdiction and venue]

## III. FACTUAL ALLEGATIONS
[State the relevant facts]

## IV. CLAIMS FOR RELIEF
### Count I: [Claim]
[State the elements of the claim]

### Count II: [Claim]
[State the elements of the claim]

## V. PRAYER FOR RELIEF
WHEREFORE, [PARTY NAME] respectfully requests that this Court:
1. [Relief requested]
2. [Additional relief]
3. Grant such other relief as this Court deems just and proper.

Respectfully submitted,
[Attorney Name]
[Attorney Title]
[Bar Number]
[Contact Information]
`,
    documentType: "pleading",
    tags: ["pleading", "template"],
    citations: [],
  },
};

// GET /api/documents/templates - Get available document templates
export async function GET({ url }: RequestEvent): Promise<any> {
  try {
    const documentType = url.searchParams.get("type");

    if (documentType) {
      const template =
        documentTemplates[documentType as keyof typeof documentTemplates];

      if (!template) {
        return json(
          {
            success: false,
            error: `Template not found for document type: ${documentType}`,
          },
          { status: 404 },
        );
      }
      return json({
        success: true,
        template,
      });
    }
    // Return all templates with metadata
    const templates = Object.entries(documentTemplates).map(
      ([key, template]) => ({
        id: key,
        name: template.title,
        documentType: template.documentType,
        tags: template.tags,
        description: getTemplateDescription(key),
      }),
    );

    return json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch templates",
      },
      { status: 500 },
    );
  }
}
// Helper function to get template descriptions
function getTemplateDescription(templateKey: string): string {
  const descriptions = {
    brief:
      "A comprehensive template for criminal case briefs with fact analysis and legal arguments",
    motion:
      "A structured template for legal motions with proper formatting and argument sections",
    contract:
      "A basic contract template with standard clauses and signature blocks",
    evidence:
      "A detailed template for evidence analysis reports with inventory and conclusions",
    memo: "A legal memorandum template with question presented, analysis, and conclusions",
    pleading:
      "A formal pleading template with proper court formatting and claim structure",
  };

  return (
    descriptions[templateKey as keyof typeof descriptions] ||
    "Legal document template"
  );
}
// POST /api/documents/templates/[type] - Create a new document from a template
export async function POST({ url, request }: RequestEvent): Promise<any> {
  try {
    const templateType = url.pathname.split("/").pop();
    const body = await request.json();

    if (
      !templateType ||
      !documentTemplates[templateType as keyof typeof documentTemplates]
    ) {
      return json(
        {
          success: false,
          error: `Template not found for type: ${templateType}`,
        },
        { status: 404 },
      );
    }
    const template =
      documentTemplates[templateType as keyof typeof documentTemplates];
    const { title, caseId, userId, customizations = {} } = body;

    // Apply customizations to the template
    let customizedContent = template.content;

    // Replace placeholders with customizations
    Object.entries(customizations).forEach(([key, value]) => {
      const placeholder = `[${key}]`;
      customizedContent = customizedContent.replace(
        new RegExp(placeholder, "g"),
        value as string,
      );
    });

    // Create the document
    const newDocument = {
      id: `doc-${Date.now()}`,
      title: title || template.title,
      content: customizedContent,
      documentType: template.documentType,
      caseId: caseId || null,
      userId: userId || "user-1",
      citations: template.citations,
      tags: [...template.tags, "from-template"],
      metadata: {
        templateType,
        customizations,
        createdFromTemplate: true,
      },
      status: "draft",
      version: 1,
      wordCount: customizedContent.split(/\s+/).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return json({
      success: true,
      document: newDocument,
    });
  } catch (error: any) {
    console.error("Error creating document from template:", error);
    return json(
      {
        success: false,
        error: "Failed to create document from template",
      },
      { status: 500 },
    );
  }
}
