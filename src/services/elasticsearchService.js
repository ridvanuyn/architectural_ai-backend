const { Client } = require('@elastic/elasticsearch');

const INDEX_NAME = 'specialty_worlds';

let client = null;
let isAvailable = false;

const getClient = () => {
  if (!client) {
    const url = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    client = new Client({ node: url });
  }
  return client;
};

/**
 * Check if Elasticsearch is reachable.
 */
const ping = async () => {
  try {
    await getClient().ping();
    isAvailable = true;
    return true;
  } catch {
    isAvailable = false;
    return false;
  }
};

/**
 * Create the index with proper mappings for autocomplete + full-text search.
 */
const ensureIndex = async () => {
  const es = getClient();
  const exists = await es.indices.exists({ index: INDEX_NAME });
  if (exists) return;

  await es.indices.create({
    index: INDEX_NAME,
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'autocomplete_tokenizer',
            filter: ['lowercase'],
          },
          search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase'],
          },
        },
        tokenizer: {
          autocomplete_tokenizer: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 15,
            token_chars: ['letter', 'digit'],
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'search_analyzer',
          fields: {
            exact: { type: 'keyword' },
          },
        },
        description: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'search_analyzer',
        },
        category: { type: 'keyword' },
        imageUrl: { type: 'keyword', index: false },
        prompt: { type: 'text', analyzer: 'standard' },
        price: { type: 'float' },
        isProOnly: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        isActive: { type: 'boolean' },
        sortOrder: { type: 'integer' },
        createdAt: { type: 'date' },
      },
    },
  });
  console.log('✅ Elasticsearch index created:', INDEX_NAME);
};

/**
 * Index a single world document.
 */
const indexWorld = async (world) => {
  if (!isAvailable) return;
  try {
    await getClient().index({
      index: INDEX_NAME,
      id: world.id,
      document: {
        id: world.id,
        name: world.name,
        description: world.description,
        category: world.category,
        imageUrl: world.imageUrl,
        prompt: world.prompt,
        price: world.price,
        isProOnly: world.isProOnly,
        isFeatured: world.isFeatured,
        isActive: world.isActive,
        sortOrder: world.sortOrder,
        createdAt: world.createdAt,
      },
    });
  } catch (e) {
    console.error('ES index error:', e.message);
  }
};

/**
 * Bulk index all worlds from MongoDB.
 */
const syncAll = async (worlds) => {
  const es = getClient();
  if (worlds.length === 0) return;

  const body = worlds.flatMap((w) => [
    { index: { _index: INDEX_NAME, _id: w.id } },
    {
      id: w.id,
      name: w.name,
      description: w.description,
      category: w.category,
      imageUrl: w.imageUrl,
      prompt: w.prompt,
      price: w.price,
      isProOnly: w.isProOnly,
      isFeatured: w.isFeatured,
      isActive: w.isActive,
      sortOrder: w.sortOrder,
      createdAt: w.createdAt,
    },
  ]);

  const result = await es.bulk({ refresh: true, body });
  console.log(`✅ ES sync complete: ${worlds.length} docs, errors: ${result.errors}`);
  return result;
};

/**
 * Search worlds using Elasticsearch. Returns { hits, total }.
 */
const search = async ({ query = '', page = 1, limit = 20, category = null }) => {
  const es = getClient();
  const from = (page - 1) * limit;

  const must = [{ term: { isActive: true } }];

  if (query.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: ['name^3', 'description^2', 'id^2', 'prompt'],
        type: 'best_fields',
        fuzziness: 'AUTO',
        prefix_length: 1,
      },
    });
  }

  if (category) {
    must.push({ term: { category } });
  }

  const sortClause = query.trim()
    ? [{ _score: 'desc' }, { isFeatured: 'desc' }, { sortOrder: 'asc' }]
    : [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { 'name.exact': 'asc' }];

  const result = await es.search({
    index: INDEX_NAME,
    from,
    size: limit,
    query: { bool: { must } },
    sort: sortClause,
    _source: ['id', 'name', 'description', 'category', 'imageUrl', 'prompt', 'price', 'isProOnly', 'isFeatured', 'createdAt'],
  });

  const total = typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total;
  const hits = result.hits.hits.map((h) => h._source);

  return { hits, total };
};

/**
 * Delete a world from the index.
 */
const deleteWorld = async (worldId) => {
  if (!isAvailable) return;
  try {
    await getClient().delete({ index: INDEX_NAME, id: worldId });
  } catch (e) {
    if (e.meta?.statusCode !== 404) console.error('ES delete error:', e.message);
  }
};

/**
 * Count docs in the index. Useful to check if sync is needed.
 */
const count = async () => {
  try {
    const result = await getClient().count({ index: INDEX_NAME });
    return result.count || 0;
  } catch {
    return 0;
  }
};

module.exports = {
  ping,
  ensureIndex,
  indexWorld,
  syncAll,
  search,
  deleteWorld,
  count,
  isReady: () => isAvailable,
};
