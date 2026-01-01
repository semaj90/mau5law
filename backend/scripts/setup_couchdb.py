#!/usr/bin/env python3
"""
CouchDB Setup Script
Initializes databases and creates MapReduce views for graph analysis.
"""

import sys
import os
import json
import requests
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.couchdb_client import get_couchdb_client


COUCHDB_URL = os.getenv("COUCHDB_URL", "http://admin:password@localhost:5984")


def check_couchdb_health():
    """Verify CouchDB is running"""
    try:
        response = requests.get(f"{COUCHDB_URL}/_up", timeout=5)
        if response.status_code == 200:
            print("✅ CouchDB is running")
            return True
        else:
            print(f"❌ CouchDB health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to CouchDB. Is it running?")
        print(f"   URL: {COUCHDB_URL}")
        print("\n   Start with: docker start phase89-couchdb")
        return False


def create_design_docs():
    """Create MapReduce design documents"""

    client = get_couchdb_client()

    # Design doc for codebase topology
    topology_design = {
        "_id": "_design/topology",
        "language": "javascript",
        "views": {
            "by_error_count": {
                "map": """
                function(doc) {
                    if (doc.type === 'file' && doc.error_count > 0) {
                        emit(doc.error_count, {
                            path: doc.path,
                            errors: doc.error_count,
                            classes: doc.classes,
                            functions: doc.functions
                        });
                    }
                }
                """
            },
            "by_import_count": {
                "map": """
                function(doc) {
                    if (doc.type === 'file' && doc.imports) {
                        emit(doc.imports.length, doc.path);
                    }
                }
                """
            },
            "dependency_graph": {
                "map": """
                function(doc) {
                    if (doc.type === 'file' && doc.imports) {
                        doc.imports.forEach(function(imp) {
                            emit(imp, doc.path);
                        });
                    }
                }
                """,
                "reduce": "_count"
            }
        }
    }

    # Save design doc
    if "_design/topology" in client.codebase_graph:
        existing = client.codebase_graph["_design/topology"]
        topology_design["_rev"] = existing["_rev"]

    client.codebase_graph.save(topology_design)
    print("✅ Created design doc: _design/topology")

    # Design doc for LLM summaries
    summaries_design = {
        "_id": "_design/summaries",
        "language": "javascript",
        "views": {
            "by_file": {
                "map": """
                function(doc) {
                    if (doc.type === 'llm_summary') {
                        emit(doc.file_path, doc.summary);
                    }
                }
                """
            },
            "by_provider": {
                "map": """
                function(doc) {
                    if (doc.type === 'llm_summary') {
                        emit(doc.llm_provider, 1);
                    }
                }
                """,
                "reduce": "_count"
            }
        }
    }

    if "_design/summaries" in client.llm_summaries:
        existing = client.llm_summaries["_design/summaries"]
        summaries_design["_rev"] = existing["_rev"]

    client.llm_summaries.save(summaries_design)
    print("✅ Created design doc: _design/summaries")

    # Design doc for error clusters
    clusters_design = {
        "_id": "_design/clusters",
        "language": "javascript",
        "views": {
            "by_size": {
                "map": """
                function(doc) {
                    if (doc.type === 'error_cluster') {
                        emit(doc.member_files.length, {
                            cluster_id: doc.cluster_id,
                            label: doc.cluster_label,
                            file_count: doc.member_files.length
                        });
                    }
                }
                """
            },
            "by_label": {
                "map": """
                function(doc) {
                    if (doc.type === 'error_cluster') {
                        emit(doc.cluster_label, doc.cluster_id);
                    }
                }
                """
            }
        }
    }

    if "_design/clusters" in client.error_clusters:
        existing = client.error_clusters["_design/clusters"]
        clusters_design["_rev"] = existing["_rev"]

    client.error_clusters.save(clusters_design)
    print("✅ Created design doc: _design/clusters")


def print_stats():
    """Print database statistics"""
    client = get_couchdb_client()
    stats = client.health_check()

    print("\n📊 Database Statistics:")
    print("═" * 50)
    print(f"CouchDB Version: {stats['version']}")
    print()

    for db_name, db_stats in stats['databases'].items():
        print(f"{db_name}:")
        print(f"  - Documents: {db_stats['doc_count']}")
        print(f"  - Status: {'✅ Active' if db_stats['exists'] else '❌ Missing'}")

    print("═" * 50)


def main():
    print("🚀 CouchDB Setup for RAG + Graph Analysis")
    print("═" * 50)
    print()

    # Step 1: Health check
    if not check_couchdb_health():
        sys.exit(1)

    print()

    # Step 2: Initialize client (creates databases)
    print("📦 Initializing databases...")
    client = get_couchdb_client()
    print("✅ Databases initialized")
    print()

    # Step 3: Create design documents
    print("📝 Creating MapReduce views...")
    create_design_docs()
    print()

    # Step 4: Print stats
    print_stats()

    print()
    print("✅ Setup complete!")
    print()
    print("Next steps:")
    print("  1. Run codebase indexer: python backend/scripts/index_codebase.py")
    print("  2. Generate LLM summaries: python backend/scripts/generate_summaries.py")
    print("  3. View Fauxton UI: http://localhost:5984/_utils")


if __name__ == "__main__":
    main()
