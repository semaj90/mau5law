-- Quick PostgreSQL Status Check for Legal AI Database

-- Show current database
SELECT current_database() as current_db, current_user as user, version() as pg_version;

-- List extensions
SELECT extname as extension, extversion as version FROM pg_extension ORDER BY extname;

-- List all tables with row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Show existing indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Show current connections
SELECT 
    datname as database,
    count(*) as connections,
    state
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY datname, state
ORDER BY connections DESC;