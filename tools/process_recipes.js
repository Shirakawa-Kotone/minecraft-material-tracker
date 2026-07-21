#!/usr/bin/env node
/**
 * Minecraft 配方预处理脚本
 * 
 * 读取 recipes.json + items_ref.json，构建配方树，
 * 找出"基础材料"，计算每个物品的分解方案，
 * 输出为前端可用的 compact JSON。
 * 
 * 用法: node tools/process_recipes.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname + '/..';

// ====== 加载数据 ======
const recipes = JSON.parse(fs.readFileSync(DATA_DIR + '/recipes.json', 'utf-8'));
const items = JSON.parse(fs.readFileSync(DATA_DIR + '/items_ref.json', 'utf-8'));
const blocks = JSON.parse(fs.readFileSync(DATA_DIR + '/blocks_ref.json', 'utf-8'));

// 构建 ID ↔ 名称 映射
const idToName = {};
const nameToId = {};
const idToStack = {};
const idToDisplay = {};

for (const item of items) {
  idToName[item.id] = item.name;
  nameToId[item.name] = item.id;
  idToStack[item.id] = item.stackSize;
  idToDisplay[item.id] = item.displayName;
}
// 补充方块名
for (const block of blocks) {
  const name = block.name;
  if (name && !nameToId[name]) {
    // blocks might have different IDs, but names should match
  }
}

// ====== 配方解析 ======

// 将网格配方转为扁平材料列表
function parseShapeRecipe(recipe) {
  const ingredients = {};
  const shape = recipe.inShape;
  for (const row of shape) {
    for (const cell of row) {
      if (cell != null) {
        // cell can be int (item ID) or object {id, count}
        const id = typeof cell === 'number' ? cell : cell.id;
        const count = typeof cell === 'number' ? 1 : (cell.count || 1);
        ingredients[id] = (ingredients[id] || 0) + count;
      }
    }
  }
  return ingredients;
}

function parseIngredients(recipe) {
  const ingredients = {};
  for (const ing of recipe.ingredients) {
    const id = typeof ing === 'number' ? ing : ing.id;
    const count = typeof ing === 'number' ? 1 : (ing.count || 1);
    ingredients[id] = (ingredients[id] || 0) + count;
  }
  return ingredients;
}

// 解析一个配方，返回 {input: {id: count}, output: {id, count}}
function parseRecipe(recipe) {
  const result = recipe.result;
  let input;
  if (recipe.inShape) {
    input = parseShapeRecipe(recipe);
  } else if (recipe.ingredients) {
    input = parseIngredients(recipe);
  } else {
    return null;
  }
  return { input, output: { id: result.id, count: result.count || 1 } };
}

// ====== 建立所有配方 ======
// recipeMap[itemId] = [{ input: {id: count}, output: {id, count} }, ...]
const recipeMap = {};

for (const [resultIdStr, recipeList] of Object.entries(recipes)) {
  const resultId = parseInt(resultIdStr);
  const list = Array.isArray(recipeList) ? recipeList : [recipeList];
  
  for (const r of list) {
    const parsed = parseRecipe(r);
    if (parsed) {
      if (!recipeMap[resultId]) recipeMap[resultId] = [];
      recipeMap[resultId].push(parsed);
    }
  }
}

// ====== 判断是否为基础材料 ======
// 基础材料 = 没有合成配方，或者只能通过挖掘/烧炼获得

const CRAFTING_BLACKLIST = new Set([
  // 这些虽然可合成，但应视为基础材料（来源更广）
  'cobblestone', 'stone', 'deepslate', 'cobbled_deepslate',
  'sand', 'gravel', 'dirt', 'grass_block',
  'cherry_log', 'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'pale_oak_log',
  'cherry_leaves', 'oak_leaves',
  'calcite', 'diorite', 'andesite', 'granite',
  'iron_ingot', 'gold_ingot', 'copper_ingot', 'netherite_ingot',
  'iron_nugget', 'gold_nugget',
  'coal', 'charcoal', 'diamond', 'emerald', 'lapis_lazuli', 'redstone',
  'quartz', 'nether_quartz',
  'bone', 'bone_meal',
  'flint', 'clay_ball', 'brick',
  'leather', 'feather', 'string', 'slime_ball',
  'stick',
]);

function isBaseMaterial(itemId) {
  const name = idToName[itemId];
  if (!name) return true;
  // 空气
  if (itemId === 0) return true;
  // 黑名单中的可直接获取材料
  if (CRAFTING_BLACKLIST.has(name)) return false; // false = 不是通过合成获取，算基底
  // 没有配方的
  if (!recipeMap[itemId]) return true;
  return false;
}

// ====== 添加切石机配方 ======
// 切石机: 1 base_block → 1 stair/slab/wall (stairs 比合成台高效)
// 我们只添加比合成台更优的切石机配方

function addStonecutterRecipes() {
  const added = [];
  
  // 所有已知的 base → variant 切石机变换
  // format: [baseName, resultName, resultCount]
  const stonecutterPatterns = [];
  
  // 遍历所有配方，找出 base → trimmed 的关系
  for (const [resultId, recipeList] of Object.entries(recipeMap)) {
    const resultName = idToName[parseInt(resultId)];
    if (!resultName) continue;
    
    // 检查是否 stairs/slab/wall/chiseled/etc
    const isVariant = resultName.endsWith('_stairs') || resultName.endsWith('_slab') || 
                      resultName.endsWith('_wall') || resultName.endsWith('_bricks') ||
                      resultName.endsWith('_tiles') || resultName.startsWith('chiseled_') ||
                      resultName.endsWith('_pillar');
    if (!isVariant) continue;
    
    // 对每个配方，检查是否使用单一材料
    for (const recipe of recipeList) {
      const inputIds = Object.keys(recipe.input);
      if (inputIds.length === 1) {
        const baseId = parseInt(inputIds[0]);
        const baseName = idToName[baseId];
        if (!baseName) continue;
        
        // 只处理石头类材料
        const stoneKeywords = ['stone', 'deepslate', 'cobblestone', 'cobbled', 'granite', 'diorite', 
          'andesite', 'basalt', 'blackstone', 'tuff', 'calcite', 'quartz', 'sandstone',
          'prismarine', 'purpur', 'nether_brick', 'brick', 'end_stone', 'mossy',
          'mud_brick', 'resin_brick'];
        const isStone = stoneKeywords.some(k => baseName.includes(k));
        if (!isStone) continue;
        
        const baseCount = recipe.input[baseId];
        const outputCount = recipe.output.count;
        
        // 切石机 stairs: 1:1 (合成台是 6:4)
        if (resultName.endsWith('_stairs') && baseCount >= 1) {
          // 切石机 1 base → 1 stair (替换 6 base → 4 stair)
          stonecutterPatterns.push({
            resultId: parseInt(resultId),
            baseId,
            outputCount: 1,
            inputCount: 1,
            label: 'stonecutter'
          });
        }
        // 切石机 slab: 1 base → 2 slabs (同合成台 3→6，但更方便)
        else if (resultName.endsWith('_slab') && baseCount >= 1) {
          stonecutterPatterns.push({
            resultId: parseInt(resultId),
            baseId,
            outputCount: 2,
            inputCount: 1,
            label: 'stonecutter'
          });
        }
        // 切石机 wall: 1:1 (同合成台)
        else if (resultName.endsWith('_wall') && baseCount >= 1) {
          stonecutterPatterns.push({
            resultId: parseInt(resultId),
            baseId,
            outputCount: 1,
            inputCount: 1,
            label: 'stonecutter'
          });
        }
      }
    }
  }
  
  // 去重并添加最优切石机配方
  for (const pattern of stonecutterPatterns) {
    if (!recipeMap[pattern.resultId]) recipeMap[pattern.resultId] = [];
    
    // 检查是否已存在更好的配方
    const existing = recipeMap[pattern.resultId];
    const isBetter = !existing.some(r => {
      const inCount = Object.values(r.input).reduce((a, b) => a + b, 0);
      const outCount = r.output.count;
      const ratio = outCount / inCount;
      // 如果已有配方的产出/投入比更高，不添加
      return ratio > pattern.outputCount / pattern.inputCount;
    });
    
    if (isBetter) {
      recipeMap[pattern.resultId].push({
        input: { [pattern.baseId]: pattern.inputCount },
        output: { id: pattern.resultId, count: pattern.outputCount },
        label: pattern.label
      });
      added.push(`${idToName[pattern.resultId]} <- ${idToName[pattern.baseId]} (${pattern.label})`);
    }
  }
  
  return added;
}

const scAdded = addStonecutterRecipes();
console.log(`添加了 ${scAdded.length} 个切石机配方`);
scAdded.slice(0, 10).forEach(s => console.log(`  ${s}`));

// ====== 材料分解引擎 ======

function getBestRecipe(itemId) {
  const list = recipeMap[itemId];
  if (!list || list.length === 0) return null;
  
  // 按效率排序: 产出/投入 比值最高的优先
  let best = null;
  let bestRatio = 0;
  
  for (const recipe of list) {
    const inCount = Object.values(recipe.input).reduce((a, b) => a + b, 0);
    const outCount = recipe.output.count;
    const ratio = outCount / inCount;
    
    // 切石机配方优先（即使比例相同）
    const priority = recipe.label === 'stonecutter' ? 1 : 0;
    
    if (ratio > bestRatio || (ratio === bestRatio && priority > (best?.priority || -1))) {
      best = { ...recipe, priority, ratio };
      bestRatio = ratio;
    }
  }
  
  return best;
}

// 递归分解材料（精确比例，不向上取整）
function decompose(itemId, needed, visited = new Set(), depth = 0) {
  if (depth > 20) return { [itemId]: needed };
  if (visited.has(itemId)) return { [itemId]: needed };
  visited.add(itemId);
  
  // 如果是基础材料，直接返回
  if (isBaseMaterial(itemId)) {
    return { [itemId]: needed };
  }
  
  const bestRecipe = getBestRecipe(itemId);
  if (!bestRecipe) {
    return { [itemId]: needed };
  }
  
  // 精确比例计算
  const result = {};
  
  for (const [inputId, countPerCycle] of Object.entries(bestRecipe.input)) {
    // 每单位 output 需要多少 input
    const ratio = countPerCycle / bestRecipe.output.count;
    const totalNeeded = ratio * needed;
    const sub = decompose(parseInt(inputId), totalNeeded, new Set(visited), depth + 1);
    
    for (const [k, v] of Object.entries(sub)) {
      result[k] = (result[k] || 0) + v;
    }
  }
  
  return result;
}

// ====== 构建完整的分解树 ======

console.log('\n构建材料分解树...');

// 对所有有配方的物品进行分解
const decompositionMap = {};
let count = 0;

for (const itemIdStr of Object.keys(recipeMap)) {
  const itemId = parseInt(itemIdStr);
  const name = idToName[itemId];
  if (!name) continue;
  
  // 跳过基础材料
  if (isBaseMaterial(itemId)) continue;
  
  // 分解 1 个单位
  const result = decompose(itemId, 1);
  decompositionMap[itemId] = result;
  count++;
  
  if (count % 100 === 0) process.stdout.write('.');
}

console.log(`\n已分解 ${count} 个物品`);

// ====== 分类系统 ======

const MATERIAL_CATEGORIES = {
  // 木头类
  'log': '🪵 原木/木头',
  'wood': '🪵 原木/木头',
  'planks': '🪵 原木/木头',
  'cherry_': '🪵 原木/木头',
  'oak_': '🪵 原木/木头',
  'spruce_': '🪵 原木/木头',
  'birch_': '🪵 原木/木头',
  'jungle_': '🪵 原木/木头',
  'acacia_': '🪵 原木/木头',
  'dark_oak_': '🪵 原木/木头',
  'mangrove_': '🪵 原木/木头',
  'bamboo_': '🪵 原木/木头',
  'pale_oak_': '🪵 原木/木头',
  // 金属类
  'iron_ingot': '🔩 金属/矿物',
  'iron_nugget': '🔩 金属/矿物',
  'iron_block': '🔩 金属/矿物',
  'gold_ingot': '🔩 金属/矿物',
  'gold_nugget': '🔩 金属/矿物',
  'gold_block': '🔩 金属/矿物',
  'copper_ingot': '🔩 金属/矿物',
  'copper_block': '🔩 金属/矿物',
  'netherite_': '🔩 金属/矿物',
  // 石头类
  'stone': '🪨 石质/矿物',
  'cobblestone': '🪨 石质/矿物',
  'cobbled': '🪨 石质/矿物',
  'deepslate': '🪨 石质/矿物',
  'granite': '🪨 石质/矿物',
  'diorite': '🪨 石质/矿物',
  'andesite': '🪨 石质/矿物',
  'calcite': '🪨 石质/矿物',
  'tuff': '🪨 石质/矿物',
  'basalt': '🪨 石质/矿物',
  'blackstone': '🪨 石质/矿物',
  'sandstone': '🪨 石质/矿物',
  'quartz': '🪨 石质/矿物',
  'prismarine': '🪨 石质/矿物',
  'end_stone': '🪨 石质/矿物',
  'nether_brick': '🪨 石质/矿物',
  'brick': '🧱 砖/陶瓦',
  'bricks': '🧱 砖/陶瓦',
  'terracotta': '🧱 砖/陶瓦',
  'concrete': '🧱 混凝土',
  // 沙/砾/玻璃
  'sand': '🏖️ 沙/砾/玻璃',
  'gravel': '🏖️ 沙/砾/玻璃',
  'glass': '🏖️ 沙/砾/玻璃',
  // 照明
  'torch': '🔥 照明/燃料',
  'lantern': '🔥 照明/燃料',
  // 装饰
  'bell': '🎨 装饰/功能性',
  'flower_pot': '🎨 装饰/功能性',
  // 植被
  'leaves': '🌿 植被/自然',
  'sapling': '🌿 植被/自然',
  'peony': '🌿 植被/自然',
  'azalea': '🌿 植被/自然',
  'grass': '🌿 植被/自然',
  'vine': '🌿 植被/自然',
  'flower': '🌿 植被/自然',
  'moss': '🌿 植被/自然',
  // 染料
  'dye': '🎨 染料',
  'bone': '🎨 染料',
};

function categorize(name) {
  for (const [keyword, cat] of Object.entries(MATERIAL_CATEGORIES)) {
    if (name && name.includes(keyword)) return cat;
  }
  return '📦 其他';
}

// ====== 输出 ======

const output = {
  version: '1.21.6',
  generatedAt: new Date().toISOString(),
  // 物品名称查找表
  names: {},
  // 堆叠大小
  stacks: {},
  // 分解树: resultItemId -> { baseItemId: count, ... }
  decompose: {},
  // 基础材料列表（可从自然界直接获取）
  baseMaterials: [],
  // 配方数量统计
  stats: {
    totalRecipes: Object.keys(recipeMap).length,
    decomposed: count,
    stonecutterAdded: scAdded.length,
  }
};

for (const item of items) {
  if (item.name && item.id !== undefined) {
    output.names[item.name] = item.displayName || item.name;
    output.stacks[item.name] = item.stackSize;
  }
}

// 基础材料
for (const item of items) {
  if (item.id > 0 && item.name && item.name !== 'air') {
    if (isBaseMaterial(item.id)) {
      output.baseMaterials.push(item.name);
    }
  }
}

// 分解树 - 只包含确实有分解意义的物品
for (const [itemId, decomposition] of Object.entries(decompositionMap)) {
  const name = idToName[parseInt(itemId)];
  if (!name) continue;
  
  // 跳过只分解到自己的情况
  const keys = Object.keys(decomposition);
  if (keys.length === 1 && keys[0] == itemId) continue;
  
  // 转换 ID 为名称
  const named = {};
  for (const [idStr, count] of Object.entries(decomposition)) {
    const baseName = idToName[parseInt(idStr)];
    if (baseName && baseName !== 'air') {
      named[baseName] = Math.ceil(count * 100) / 100; // 保留2位小数
    }
  }
  
  output.decompose[name] = named;
}

fs.writeFileSync(DATA_DIR + '/recipe-tree.json', JSON.stringify(output));
console.log(`\n✅ 已输出 recipe-tree.json`);
console.log(`   物品数: ${Object.keys(output.names).length}`);
console.log(`   分解树: ${Object.keys(output.decompose).length} 项`);
console.log(`   基础材料: ${output.baseMaterials.length} 种`);
console.log(`   文件大小: ${(fs.statSync(DATA_DIR+'/recipe-tree.json').size / 1024).toFixed(1)} KB`);
