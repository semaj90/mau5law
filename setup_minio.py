#!/usr/bin/env python3
"""
MinIO Setup Script for Hybrid Ingestion System
Creates required buckets and sets up policies for the legal AI platform.
"""

import os
import sys
from minio import Minio
from minio.error import S3Error


def setup_minio_buckets():
    """Set up MinIO buckets for the hybrid ingestion system."""

    # MinIO configuration
    minio_client = Minio(
        "localhost:9000",
        access_key="minioadmin",
        secret_key="minioadmin",
        secure=False
    )

    buckets = [
        {
            "name": "code-docs",
            "description": "Source code documentation and files"
        },
        {
            "name": "embeddings",
            "description": "Generated embeddings storage"
        },
        {
            "name": "summaries",
            "description": "Code fix summaries and analysis"
        },
        {
            "name": "temp-processing",
            "description": "Temporary files during processing"
        }
    ]

    print("🚀 Setting up MinIO buckets for Hybrid Ingestion System...")

    for bucket in buckets:
        try:
            # Create bucket if it doesn't exist
            if not minio_client.bucket_exists(bucket["name"]):
                minio_client.make_bucket(bucket["name"])
                print(f"✅ Created bucket: {bucket['name']} ({bucket['description']})")
            else:
                print(f"ℹ️  Bucket already exists: {bucket['name']}")

            # Set up bucket policies for public read access (for development)
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket['name']}/*"]
                    }
                ]
            }

            # Apply policy
            minio_client.set_bucket_policy(bucket["name"], policy)
            print(f"📋 Set public read policy for bucket: {bucket['name']}")

        except S3Error as exc:
            print(f"❌ Error setting up bucket {bucket['name']}: {exc}")
            return False

    print("✅ MinIO bucket setup complete!")
    print("\n📊 Bucket Structure:")
    print("  • code-docs/     - Original source files")
    print("  • embeddings/    - Vector embeddings (768-dim)")
    print("  • summaries/     - Code fix summaries")
    print("  • temp-processing/ - Temporary processing files")

    return True


def create_bucket_structure():
    """Create initial directory structure in buckets."""

    minio_client = Minio(
        "localhost:9000",
        access_key="minioadmin",
        secret_key="minioadmin",
        secure=False
    )

    # Create empty objects to establish directory structure
    directories = [
        ("code-docs", "src/"),
        ("code-docs", "backend/"),
        ("code-docs", "frontend/"),
        ("embeddings", "vectors/"),
        ("embeddings", "metadata/"),
        ("summaries", "fixes/"),
        ("summaries", "analysis/")
    ]

    print("\n📁 Creating bucket directory structure...")

    for bucket, directory in directories:
        try:
            # Create empty object to establish directory
            minio_client.put_object(
                bucket_name=bucket,
                object_name=f"{directory}.keep",
                data=b"",
                length=0
            )
            print(f"📂 Created directory: {bucket}/{directory}")
        except S3Error as exc:
            print(f"❌ Error creating directory {bucket}/{directory}: {exc}")

    print("✅ Directory structure setup complete!")


if __name__ == "__main__":
    try:
        if setup_minio_buckets():
            create_bucket_structure()
            print("\n🎉 MinIO setup for Hybrid Ingestion System completed successfully!")
            print("\n🔗 Access MinIO Console at: http://localhost:9001")
            print("   Username: minioadmin")
            print("   Password: minioadmin")
        else:
            print("\n❌ MinIO setup failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup error: {e}")
        sys.exit(1)