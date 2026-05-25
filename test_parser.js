// Simple parser test
// parser.js is an ES module; require() of ESM returns the namespace object in Node >=22.
// Destructure to get the named export, and wrap in an async IIFE since parse() is async.
const { Trident2DParserV2: Trident2DParser } = require('./parser.js');

// Minimal window mock — parser writes _isPureMermaidMode and reads EdgeStyle/extractMermaidLayout
global.window = {};

const testDiagram = `trident
%% Simple three-tier web app

container frontend color:#4A90E2 label:"Frontend"
container backend color:#E74C3C label:"Backend"
container data color:#27AE60 label:"Data"

node webapp(cloud)[Web Application] in frontend at (150, 250)
node mobile(mobile)[Mobile App] in frontend at (250, 250)

node api(server)[API Server] in backend at (150, 150)
node cache(redis)[Redis Cache] in backend at (250, 150)

node db(postgres)[PostgreSQL] in data at (150, 50)

webapp -->|HTTPS| api
mobile -->|HTTPS| api
api -->|Query| db
api -->|Cache| cache

text "Three-Tier Architecture" at (150, 300) textColor:#333333
`;

(async () => {
    const parser = new Trident2DParser();
    const result = await parser.parse(testDiagram);

    console.log('=== PARSER TEST RESULTS ===\n');

    if (!result) {
        console.error('FAILED: Parser returned null');
        console.error('Errors:', parser.errors);
        process.exit(1);
    }

    console.log('✅ Parse successful!\n');

    console.log('Containers:', result.containers.length);
    result.containers.forEach(c => {
        console.log(`  - ${c.id}: ${c.label} (${c.color})`);
    });

    console.log('\nNodes:', result.nodes.length);
    result.nodes.forEach(node => {
        const pos = node.positioned ? `(${node.x}, ${node.y})` : 'auto-layout';
        const container = node.container || 'no container';
        console.log(`  - ${node.id} (${node.icon}): "${node.label}" in ${container} at ${pos}`);
    });

    console.log('\nConnections:', result.connections.length);
    result.connections.forEach(conn => {
        const label = conn.label ? ` [${conn.label}]` : '';
        console.log(`  - ${conn.source} ${conn.type} ${conn.target}${label}`);
    });

    console.log('\nAnnotations:', result.annotations.length);
    result.annotations.forEach(ann => {
        console.log(`  - "${ann.content}" at (${ann.x}, ${ann.y})`);
    });

    // Basic assertions
    const assert = (condition, message) => {
        if (!condition) { console.error(`FAILED: ${message}`); process.exit(1); }
    };

    assert(result.containers.length === 3, `Expected 3 containers, got ${result.containers.length}`);
    assert(result.nodes.length === 5, `Expected 5 nodes, got ${result.nodes.length}`);
    assert(result.connections.length === 4, `Expected 4 connections, got ${result.connections.length}`);
    assert(result.annotations.length === 1, `Expected 1 annotation, got ${result.annotations.length}`);

    const httpsConn = result.connections.find(c => c.label === 'HTTPS');
    assert(httpsConn, 'Expected a connection with label "HTTPS"');

    console.log('\n=== TEST PASSED ===');
})();
