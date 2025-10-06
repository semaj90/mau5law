(async ()=>{
  try{
    const neo4j = (await import('neo4j-driver')).default || (await import('neo4j-driver'));
    const d = neo4j.driver('bolt://127.0.0.1:7687', neo4j.auth.basic('neo4j','Neo4jPass123!'));
    const s = d.session();
    const r = await s.run('RETURN 1 AS x');
    console.log('container-net result', r.records.map(rr=>rr.toObject()));
    await s.close();
    await d.close();
  }catch(e){
    console.error('container-net error', e);
    process.exit(2);
  }
})();
