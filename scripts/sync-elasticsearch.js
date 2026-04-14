#!/usr/bin/env node
/**
 * Sync all SpecialtyWorlds from MongoDB into Elasticsearch.
 * Run: node scripts/sync-elasticsearch.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SpecialtyWorld = require('../src/models/SpecialtyWorld');
const es = require('../src/services/elasticsearchService');

(async () => {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Pinging Elasticsearch...');
  const alive = await es.ping();
  if (!alive) {
    console.error('Elasticsearch is not reachable. Is it running?');
    process.exit(1);
  }

  console.log('Ensuring index exists...');
  await es.ensureIndex();

  console.log('Fetching worlds from MongoDB...');
  const worlds = await SpecialtyWorld.find({ isActive: true }).lean();
  console.log(`Found ${worlds.length} worlds`);

  console.log('Syncing to Elasticsearch...');
  await es.syncAll(worlds);

  await mongoose.disconnect();
  console.log('Done!');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
