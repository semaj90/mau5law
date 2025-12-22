"""
MCP Tool: Graph Upsert
Upserts entities/edges into Neo4j KAG
"""
import os
from typing import Dict, Any, List, Optional
from neo4j import AsyncGraphDatabase

class GraphUpsertTool:
    """Neo4j KAG upsert operations"""

    def __init__(self):
        self.uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
        self.user = os.getenv('NEO4J_USER', 'neo4j')
        self.password = os.getenv('NEO4J_PASSWORD', 'password')
        self.driver = None

    async def _get_driver(self):
        """Lazy driver initialization"""
        if not self.driver:
            self.driver = AsyncGraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password)
            )
        return self.driver

    async def upsert_entities(
        self,
        entities: List[Dict[str, Any]],
        label: str = 'Entity'
    ) -> Dict[str, Any]:
        """
        Upsert entities (nodes) into Neo4j

        Args:
            entities: List of {id, properties}
            label: Node label

        Returns:
            {
                "entities_created": 5,
                "entities_updated": 3,
                "status": "success"
            }
        """
        created = 0
        updated = 0

        try:
            driver = await self._get_driver()
            async with driver.session() as session:
                for entity in entities:
                    entity_id = entity.get('id')
                    props = entity.get('properties', {})

                    # MERGE creates if not exists, updates if exists
                    result = await session.run(
                        f"""
                        MERGE (e:{label} {{id: $id}})
                        ON CREATE SET e += $props, e.created_at = timestamp()
                        ON MATCH SET e += $props, e.updated_at = timestamp()
                        RETURN e,
                               CASE WHEN e.created_at = timestamp()
                                    THEN 'created'
                                    ELSE 'updated'
                               END as action
                        """,
                        id=entity_id,
                        props=props
                    )

                    record = await result.single()
                    if record and record['action'] == 'created':
                        created += 1
                    else:
                        updated += 1

            return {
                'entities_created': created,
                'entities_updated': updated,
                'status': 'success'
            }

        except Exception as e:
            return {
                'entities_created': created,
                'entities_updated': updated,
                'status': 'error',
                'error': str(e)
            }

    async def upsert_edges(
        self,
        edges: List[Dict[str, Any]],
        relationship_type: str = 'RELATED_TO'
    ) -> Dict[str, Any]:
        """
        Upsert edges (relationships) into Neo4j

        Args:
            edges: List of {from_id, to_id, properties}
            relationship_type: Relationship type

        Returns:
            {
                "edges_created": 8,
                "edges_updated": 2,
                "status": "success"
            }
        """
        created = 0
        updated = 0

        try:
            driver = await self._get_driver()
            async with driver.session() as session:
                for edge in edges:
                    from_id = edge.get('from_id')
                    to_id = edge.get('to_id')
                    props = edge.get('properties', {})

                    result = await session.run(
                        f"""
                        MATCH (a {{id: $from_id}}), (b {{id: $to_id}})
                        MERGE (a)-[r:{relationship_type}]->(b)
                        ON CREATE SET r += $props, r.created_at = timestamp()
                        ON MATCH SET r += $props, r.updated_at = timestamp()
                        RETURN r,
                               CASE WHEN r.created_at = timestamp()
                                    THEN 'created'
                                    ELSE 'updated'
                               END as action
                        """,
                        from_id=from_id,
                        to_id=to_id,
                        props=props
                    )

                    record = await result.single()
                    if record and record['action'] == 'created':
                        created += 1
                    else:
                        updated += 1

            return {
                'edges_created': created,
                'edges_updated': updated,
                'status': 'success'
            }

        except Exception as e:
            return {
                'edges_created': created,
                'edges_updated': updated,
                'status': 'error',
                'error': str(e)
            }

    async def query_graph(
        self,
        cypher: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute Cypher query

        Args:
            cypher: Cypher query string
            params: Query parameters

        Returns:
            {
                "results": [...],
                "columns": [...],
                "status": "success"
            }
        """
        try:
            driver = await self._get_driver()
            async with driver.session() as session:
                result = await session.run(cypher, params or {})
                records = await result.data()

                return {
                    'results': records,
                    'columns': result.keys() if records else [],
                    'count': len(records),
                    'status': 'success'
                }

        except Exception as e:
            return {
                'results': [],
                'columns': [],
                'count': 0,
                'status': 'error',
                'error': str(e)
            }

    async def close(self):
        """Close driver"""
        if self.driver:
            await self.driver.close()


# Export for FastMCP
async def graph_upsert_entities(
    entities: List[Dict[str, Any]],
    label: str = 'Entity'
) -> Dict[str, Any]:
    """MCP tool wrapper for entity upsert"""
    tool = GraphUpsertTool()
    result = await tool.upsert_entities(entities, label)
    await tool.close()
    return result


async def graph_upsert_edges(
    edges: List[Dict[str, Any]],
    relationship_type: str = 'RELATED_TO'
) -> Dict[str, Any]:
    """MCP tool wrapper for edge upsert"""
    tool = GraphUpsertTool()
    result = await tool.upsert_edges(edges, relationship_type)
    await tool.close()
    return result


async def graph_query(
    cypher: str,
    params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """MCP tool wrapper for graph query"""
    tool = GraphUpsertTool()
    result = await tool.query_graph(cypher, params)
    await tool.close()
    return result
