#!/usr/bin/env python3
"""
Build Training Dataset for Agentic LoRA Fine-tuning
Generates JSONL dataset for teaching legal tool usage to Gemma3-LoRA adapter
"""

import json
import argparse
import random
from pathlib import Path
from typing import List, Dict, Any

def create_tool_examples() -> List[Dict[str, Any]]:
    """Create examples of legal tool usage for fine-tuning"""

    examples = []

    # Search statute examples
    examples.extend([
        {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a legal AI assistant with access to legal research tools. Use the available tools to answer questions accurately."
                },
                {
                    "role": "user",
                    "content": "What are the requirements for forming a valid contract under New York law?"
                },
                {
                    "role": "assistant",
                    "content": "I need to search for contract formation requirements in New York law.",
                    "tool_calls": [
                        {
                            "name": "search_statute",
                            "arguments": {
                                "query": "contract formation requirements New York",
                                "jurisdiction": "NY",
                                "max_results": 5
                            }
                        }
                    ]
                },
                {
                    "role": "tool",
                    "content": "Found relevant statutes: NY General Obligations Law § 5-701 (Statute of Frauds), NY General Obligations Law § 5-1101 et seq. (UCC Article 2 for goods), Restatement (Second) of Contracts § 17-30."
                },
                {
                    "role": "assistant",
                    "content": "Based on the search results, the key requirements for contract formation in New York are: 1) Offer, 2) Acceptance, 3) Consideration, 4) Legal capacity, 5) Legal purpose. For certain contracts, writing is required under the Statute of Frauds."
                }
            ]
        },
        {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a legal AI assistant with access to legal research tools."
                },
                {
                    "role": "user",
                    "content": "Can a minor enter into a binding contract?"
                },
                {
                    "role": "assistant",
                    "content": "This question involves contract capacity. I should search for laws regarding minors and contract capacity.",
                    "tool_calls": [
                        {
                            "name": "search_statute",
                            "arguments": {
                                "query": "minor contract capacity",
                                "jurisdiction": "general",
                                "max_results": 3
                            }
                        }
                    ]
                },
                {
                    "role": "tool",
                    "content": "Found: Restatement (Second) of Contracts § 12 (capacity to contract), NY General Obligations Law § 3-101 (infants), 18 U.S.C. § 5031 (juveniles)."
                },
                {
                    "role": "assistant",
                    "content": "Generally, minors (under 18) lack capacity to enter binding contracts, but there are exceptions for necessaries and ratification upon reaching majority."
                }
            ]
        }
    ])

    # Case law lookup examples
    examples.extend([
        {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a legal AI assistant with access to legal research tools."
                },
                {
                    "role": "user",
                    "content": "What was the holding in Marbury v. Madison?"
                },
                {
                    "role": "assistant",
                    "content": "This is asking for a specific Supreme Court case. I should look up the case details.",
                    "tool_calls": [
                        {
                            "name": "lookup_case",
                            "arguments": {
                                "case_name": "Marbury v. Madison",
                                "court": "Supreme Court",
                                "year": 1803
                            }
                        }
                    ]
                },
                {
                    "role": "tool",
                    "content": "Case: Marbury v. Madison, 5 U.S. 137 (1803). Holding: Established judicial review - Supreme Court can declare acts of Congress unconstitutional."
                },
                {
                    "role": "assistant",
                    "content": "Marbury v. Madison (1803) established the principle of judicial review, giving the Supreme Court the power to declare acts of Congress unconstitutional if they conflict with the Constitution."
                }
            ]
        }
    ])

    # Document analysis examples
    examples.extend([
        {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a legal AI assistant with access to legal research tools."
                },
                {
                    "role": "user",
                    "content": "Please analyze this contract clause: 'Party A agrees to indemnify Party B for any losses arising from Party A's negligence.'"
                },
                {
                    "role": "assistant",
                    "content": "This is a contract analysis request. I should use the document analysis tool to break down the clause.",
                    "tool_calls": [
                        {
                            "name": "analyze_document",
                            "arguments": {
                                "document_text": "Party A agrees to indemnify Party B for any losses arising from Party A's negligence.",
                                "analysis_type": "contract_clause",
                                "jurisdiction": "general"
                            }
                        }
                    ]
                },
                {
                    "role": "tool",
                    "content": "Analysis: This is an indemnification clause. Party A assumes liability for losses caused by their own negligence. This is a strong protection for Party B but may be unconscionable depending on context."
                },
                {
                    "role": "assistant",
                    "content": "This indemnification clause requires Party A to compensate Party B for any losses resulting from Party A's own negligence. While common in commercial contracts, such broad indemnification might be scrutinized for fairness depending on the parties' relative bargaining power."
                }
            ]
        }
    ])

    # Regulatory research examples
    examples.extend([
        {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a legal AI assistant with access to legal research tools."
                },
                {
                    "role": "user",
                    "content": "What are the SEC disclosure requirements for public companies?"
                },
                {
                    "role": "assistant",
                    "content": "This involves SEC regulations. I should search the Code of Federal Regulations and SEC rules.",
                    "tool_calls": [
                        {
                            "name": "search_regulation",
                            "arguments": {
                                "query": "SEC disclosure requirements public companies",
                                "agency": "SEC",
                                "regulation_type": "rule",
                                "max_results": 5
                            }
                        }
                    ]
                },
                {
                    "role": "tool",
                    "content": "Found: Regulation S-K (17 CFR Part 229), Regulation S-X (17 CFR Part 210), Item 10 of Form 10-K, Section 13(a) of Securities Exchange Act of 1934."
                },
                {
                    "role": "assistant",
                    "content": "Public companies must comply with SEC disclosure requirements including Regulation S-K (non-financial statement disclosure), Regulation S-X (financial statements), and periodic filings like Form 10-K under Section 13(a) of the Securities Exchange Act."
                }
            ]
        }
    ])

    return examples

def create_diverse_examples() -> List[Dict[str, Any]]:
    """Create diverse examples to improve model generalization"""

    examples = []

    # Multi-tool conversations
    examples.append({
        "messages": [
            {
                "role": "system",
                "content": "You are a legal AI assistant with access to legal research tools."
            },
            {
                "role": "user",
                "content": "I'm drafting a non-compete agreement for my startup. What key elements should I include?"
            },
            {
                "role": "assistant",
                "content": "This involves contract drafting and restrictive covenant law. I should search for non-compete requirements and also look up relevant case law.",
                "tool_calls": [
                    {
                        "name": "search_statute",
                        "arguments": {
                            "query": "non-compete agreement requirements",
                            "jurisdiction": "general",
                            "max_results": 3
                        }
                    },
                    {
                        "name": "lookup_case",
                        "arguments": {
                            "case_name": "Application Group, Inc. v. Hunter Group, Inc.",
                            "court": "Delaware Supreme Court",
                            "year": 2008
                        }
                    }
                ]
            },
            {
                "role": "tool",
                "content": "Statutes: Restatement (Second) of Contracts § 188, various state statutes on restrictive covenants. Case: Application Group v. Hunter Group (2008) - Delaware Supreme Court held Delaware law governs non-competes."
            },
            {
                "role": "assistant",
                "content": "Key elements for a non-compete agreement include: 1) Reasonable geographic scope, 2) Reasonable time duration, 3) Legitimate business interest protection, 4) Consideration provided to employee, 5) Choice of law provision. Delaware law is often chosen for its employer-friendly stance on non-competes."
            }
        ]
    })

    # Error handling examples
    examples.append({
        "messages": [
            {
                "role": "system",
                "content": "You are a legal AI assistant with access to legal research tools."
            },
            {
                "role": "user",
                "content": "What does 42 U.S.C. § 1983 mean?"
            },
            {
                "role": "assistant",
                "content": "This is a specific statutory citation. I should look it up directly.",
                "tool_calls": [
                    {
                        "name": "search_statute",
                        "arguments": {
                            "query": "42 U.S.C. § 1983",
                            "jurisdiction": "federal",
                            "max_results": 1
                        }
                    }
                ]
            },
            {
                "role": "tool",
                "content": "42 U.S.C. § 1983: Civil action for deprivation of rights - Every person who, under color of any statute, ordinance, regulation, custom, or usage, of any State or Territory or the District of Columbia, subjects, or causes to be subjected, any citizen of the United States or other person within the jurisdiction thereof to the deprivation of any rights, privileges, or immunities secured by the Constitution and laws, shall be liable to the party injured in an action at law, suit in equity, or other proper proceeding for redress."
            },
            {
                "role": "assistant",
                "content": "42 U.S.C. § 1983 provides a federal civil rights remedy for violations of constitutional rights by persons acting under color of state law. It's commonly used in civil rights litigation against government officials or entities."
            }
        ]
    })

    return examples

def main():
    parser = argparse.ArgumentParser(description="Build training dataset for agentic LoRA fine-tuning")
    parser.add_argument("--output", "-o", required=True, help="Output JSONL file path")
    parser.add_argument("--num_examples", "-n", type=int, default=1000, help="Number of examples to generate")
    parser.add_argument("--seed", "-s", type=int, default=42, help="Random seed for reproducibility")

    args = parser.parse_args()

    random.seed(args.seed)

    print("🔧 Building Agentic LoRA Training Dataset")
    print("=" * 50)
    print(f"Output file: {args.output}")
    print(f"Target examples: {args.num_examples}")
    print()

    # Create base examples
    base_examples = create_tool_examples()
    diverse_examples = create_diverse_examples()

    all_examples = base_examples + diverse_examples

    # Generate variations and augment dataset
    augmented_examples = []
    for example in all_examples:
        augmented_examples.append(example)

        # Create slight variations
        if random.random() < 0.3:  # 30% chance
            varied_example = json.loads(json.dumps(example))  # Deep copy

            # Slightly vary the user question
            if "contract" in varied_example["messages"][1]["content"].lower():
                varied_example["messages"][1]["content"] = varied_example["messages"][1]["content"].replace(
                    "contract", "agreement"
                )
            elif "agreement" in varied_example["messages"][1]["content"].lower():
                varied_example["messages"][1]["content"] = varied_example["messages"][1]["content"].replace(
                    "agreement", "contract"
                )

            augmented_examples.append(varied_example)

    # Fill to target number with duplicates if needed
    while len(augmented_examples) < args.num_examples:
        augmented_examples.extend(all_examples)

    # Trim to exact number
    examples = augmented_examples[:args.num_examples]

    # Shuffle
    random.shuffle(examples)

    # Write to JSONL
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        for example in examples:
            json.dump(example, f, ensure_ascii=False)
            f.write('\n')

    print(f"✅ Generated {len(examples)} training examples")
    print(f"📄 Saved to {args.output}")
    print()
    print("📊 Dataset Statistics:")
    print(f"  Total examples: {len(examples)}")
    print(f"  Unique examples: {len(set(json.dumps(ex, sort_keys=True) for ex in examples))}")
    print(f"  Average conversation length: {sum(len(ex['messages']) for ex in examples) / len(examples):.1f} messages")
    print()
    print("🎯 Next Steps:")
    print("  1. Review sample examples: head -5 agentic_tool_calling.jsonl | jq .")
    print("  2. Fine-tune LoRA: python3 scripts/train_lora_adapter.py --dataset agentic_tool_calling.jsonl")
    print("  3. Test agentic capabilities: python3 scripts/test_agentic_model.py")

if __name__ == "__main__":
    main()