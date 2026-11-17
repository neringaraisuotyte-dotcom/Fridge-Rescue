import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path, imports = {}) {
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => imports[name], loaded, loaded.exports);
  return loaded.exports;
}
const meals = load('lib/meals.ts');
const { selectBookRecipes, recipeBookContext, getRecipeBook } = load('lib/recipe-book.ts', { '@/lib/meals': meals });
const book = [{ idMeal: '1', strMeal: 'Real recipe', strMealThumb: '/photo', strIngredient1: 'Chicken' }];

test('uses canonical names and deduplicates model selections', () => {
  assert.deepEqual(selectBookRecipes('{"recipe_ids":["1","1"]}', book), [
    { idMeal: '1', strMeal: 'Real recipe', strMealThumb: '/photo' },
  ]);
  assert.deepEqual(recipeBookContext(book)[0].ingredients, ['Chicken']);
});
test('rejects invented IDs and malformed model responses', () => {
  for (const content of ['{"recipe_ids":["999"]}', '{"recipe_ids":[1]}', '{}', 'not json']) {
    assert.throws(() => selectBookRecipes(content, book));
  }
  assert.deepEqual(selectBookRecipes('{"recipe_ids":[]}', book), []);
});
test('fetches every initial, deduplicates results, and fails on an unavailable source', async () => {
  const original = global.fetch;
  const urls = [];
  try {
    global.fetch = async url => {
      urls.push(url);
      return { ok: true, json: async () => ({ meals: url.endsWith('a') || url.endsWith('b') ? book : null }) };
    };
    assert.deepEqual(await getRecipeBook(), book);
    assert.equal(new Set(urls).size, 26);
    global.fetch = async () => ({ ok: false });
    await assert.rejects(getRecipeBook());
  } finally { global.fetch = original; }
});
