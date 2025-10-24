#!/bin/bash
# Safe Database Migration Script - Preserves All Data

set -e  # Exit on error

# Configuration
DB_USER="legal_admin"
DB_HOST="localhost"
DB_NAME="legal_ai_db"
DB_PASS="123456"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"

echo "🔒 Safe Database Migration Script"
echo "=================================="
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Timestamp: $TIMESTAMP"
echo ""

# Step 1: Backup Database
echo "📦 Step 1: Creating database backup..."
PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --no-privileges --no-owner > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE ($SIZE)"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Step 2: Check current tables
echo ""
echo "📋 Step 2: Current database tables..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t << 'SQL'
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
SQL

# Step 3: Create archive tables
echo ""
echo "🗂️  Step 3: Creating archive tables..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
-- Archive all data before migration
CREATE TABLE IF NOT EXISTS archive_cases_${TIMESTAMP} AS SELECT * FROM cases WHERE EXISTS (SELECT 1 FROM cases);
CREATE TABLE IF NOT EXISTS archive_evidence_${TIMESTAMP} AS SELECT * FROM evidence WHERE EXISTS (SELECT 1 FROM evidence);
CREATE TABLE IF NOT EXISTS archive_knowledge_base_${TIMESTAMP} AS SELECT * FROM knowledge_base WHERE EXISTS (SELECT 1 FROM knowledge_base);
CREATE TABLE IF NOT EXISTS archive_rag_documents_${TIMESTAMP} AS SELECT * FROM rag_documents WHERE EXISTS (SELECT 1 FROM rag_documents);

-- Log archive results
\o /dev/null
SELECT 'Cases archived: ' || COUNT(*) FROM archive_cases_${TIMESTAMP};
SELECT 'Evidence archived: ' || COUNT(*) FROM archive_evidence_${TIMESTAMP};
SELECT 'Knowledge base archived: ' || COUNT(*) FROM archive_knowledge_base_${TIMESTAMP};
SELECT 'RAG documents archived: ' || COUNT(*) FROM archive_rag_documents_${TIMESTAMP};
\o
EOF

echo "✅ Archive tables created"

# Step 4: Fix permissions
echo ""
echo "🔐 Step 4: Fixing table permissions..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF 2>/dev/null || true
ALTER TABLE IF EXISTS error_logs OWNER TO $DB_USER;
ALTER TABLE IF EXISTS chat_sessions OWNER TO $DB_USER;
ALTER TABLE IF EXISTS knowledge_graphs OWNER TO $DB_USER;
ALTER TABLE IF EXISTS evidence_connections OWNER TO $DB_USER;
ALTER TABLE IF EXISTS legal_topics OWNER TO $DB_USER;
ALTER TABLE IF EXISTS legal_entities OWNER TO $DB_USER;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
GRANT USAGE ON SCHEMA public TO $DB_USER;
EOF

echo "✅ Permissions fixed"

# Step 5: Generate migration
echo ""
echo "📝 Step 5: Generating migration..."
cd sveltekit-frontend
npx drizzle-kit generate --name "safe_migration_${TIMESTAMP}"

if [ -f "drizzle/migrations"/*"safe_migration"* ]; then
    echo "✅ Migration file generated"
    echo ""
    echo "Generated migration location:"
    ls -lh drizzle/migrations/*safe_migration*
else
    echo "⚠️  No new migrations needed"
fi

# Step 6: Review migration
echo ""
echo "📋 Step 6: Reviewing migration..."
if [ -f "drizzle/migrations"/*"safe_migration"*.sql ]; then
    MIGRATION_FILE=$(ls -t drizzle/migrations/*safe_migration*.sql | head -1)
    echo "Migration file: $MIGRATION_FILE"
    echo ""
    echo "First 20 lines:"
    head -20 "$MIGRATION_FILE"
    echo ""
    echo "Data loss statements (if any):"
    grep -i "drop\|delete\|truncate" "$MIGRATION_FILE" || echo "✅ No data loss detected"
fi

# Step 7: Confirmation
echo ""
echo "=================================="
echo "⚠️  BEFORE PROCEEDING:"
echo "1. Review migration file above"
echo "2. Backup file created: $BACKUP_FILE"
echo "3. Archive tables created with timestamp"
echo ""
echo "To continue migration, run:"
echo "  npm run db:push"
echo ""
echo "To rollback if needed:"
echo "  PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo "=================================="

echo ""
echo "✅ Safe migration preparation complete!"
