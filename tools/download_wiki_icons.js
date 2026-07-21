/**
 * 从 Minecraft Wiki CDN 下载立体 3D 物品图标
 * 覆盖 images/ 目录下原有的平面方块纹理
 * 
 * 用法: node tools/download_wiki_icons.js [--concurrency=N]
 */
const fs = require('fs');
const https = require('https');
const http = require('http');

// ====== 配置 ======
const IMG_DIR = __dirname + '/../images';
const CONCURRENCY = parseInt(process.argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] || 10);
const PROXY = null; // Wiki CDN 直连可访问，不需要代理

// ====== Wiki CDN URL 覆盖映射 ======
// 某些物品的 Wiki 图标名不是简单的 PascalCase
const OVERRIDES = {
  // 矿物块: Block_of_X
  'iron_block': 'Block_of_Iron',
  'gold_block': 'Block_of_Gold',
  'diamond_block': 'Block_of_Diamond',
  'emerald_block': 'Block_of_Emerald',
  'redstone_block': 'Block_of_Redstone',
  'lapis_block': 'Block_of_Lapis_Lazuli',
  'coal_block': 'Block_of_Coal',
  'netherite_block': 'Block_of_Netherite',
  'raw_iron_block': 'Block_of_Raw_Iron',
  'raw_gold_block': 'Block_of_Raw_Gold',
  'raw_copper_block': 'Block_of_Raw_Copper',
  'quartz_block': 'Block_of_Quartz',
  'smooth_quartz': 'Smooth_Quartz',
  'smooth_stone': 'Smooth_Stone',
  'smooth_sandstone': 'Smooth_Sandstone',
  'smooth_red_sandstone': 'Smooth_Red_Sandstone',
  // 物品
  'quartz': 'Nether_Quartz',
  'nether_quartz': 'Nether_Quartz',
  'bone_meal': 'Bone_Meal',
  'light_gray_dye': 'Light_Gray_Dye',
  'gold_ingot': 'Gold_Ingot',
  'gold_nugget': 'Gold_Nugget',
  'iron_nugget': 'Iron_Nugget',
  'netherite_ingot': 'Netherite_Ingot',
  'netherite_scrap': 'Netherite_Scrap',
  'copper_ingot': 'Copper_Ingot',
  'iron_ingot': 'Iron_Ingot',
  'raw_iron': 'Raw_Iron',
  'raw_gold': 'Raw_Gold',
  'raw_copper': 'Raw_Copper',
  'redstone': 'Redstone',
  'lapis_lazuli': 'Lapis_Lazuli',
  'bone': 'Bone',
  'stick': 'Stick',
  'bowl': 'Bowl',
  'leather': 'Leather',
  'feather': 'Feather',
  'flint': 'Flint',
  'string': 'String',
  'sugar': 'Sugar',
  'paper': 'Paper',
  'book': 'Book',
  'arrow': 'Arrow',
  'coal': 'Coal',
  'charcoal': 'Charcoal',
  'diamond': 'Diamond',
  'emerald': 'Emerald',
  'clay_ball': 'Clay_Ball',
  'brick': 'Brick',
  'nether_brick': 'Nether_Brick',
  'glass_bottle': 'Glass_Bottle',
  'slime_ball': 'Slimeball',
  'ender_pearl': 'Ender_Pearl',
  'blaze_rod': 'Blaze_Rod',
  'blaze_powder': 'Blaze_Powder',
  'ghast_tear': 'Ghast_Tear',
  'magma_cream': 'Magma_Cream',
  'glowstone_dust': 'Glowstone_Dust',
  'spider_eye': 'Spider_Eye',
  'fermented_spider_eye': 'Fermented_Spider_Eye',
  'gunpowder': 'Gunpowder',
  'rotten_flesh': 'Rotten_Flesh',
  'ender_eye': 'Eye_of_Ender',
  'glistering_melon_slice': 'Glistering_Melon',
  'experience_bottle': 'Bottle_o_Enchanting',
  'fire_charge': 'Fire_Charge',
  'nautilus_shell': 'Nautilus_Shell',
  'prismarine_shard': 'Prismarine_Shard',
  'prismarine_crystals': 'Prismarine_Crystals',
  'heart_of_the_sea': 'Heart_of_the_Sea',
  'honeycomb': 'Honeycomb',
  'honey_bottle': 'Honey_Bottle',
  'shulker_shell': 'Shulker_Shell',
  'phantom_membrane': 'Phantom_Membrane',
  'totem_of_undying': 'Totem_of_Undying',
  'dragon_breath': 'Dragon_Breath',
  'elytra': 'Elytra',
  'saddle': 'Saddle',
  'ink_sac': 'Ink_Sac',
  'glow_ink_sac': 'Glow_Ink_Sac',
  'cocoa_beans': 'Cocoa_Beans',
  'wheat': 'Wheat',
  'wheat_seeds': 'Wheat_Seeds',
  'beetroot': 'Beetroot',
  'beetroot_seeds': 'Beetroot_Seeds',
  'melon_slice': 'Melon',
  'apple': 'Apple',
  'golden_apple': 'Golden_Apple',
  'enchanted_golden_apple': 'Enchanted_Golden_Apple',
  'carrot': 'Carrot',
  'golden_carrot': 'Golden_Carrot',
  'potato': 'Potato',
  'baked_potato': 'Baked_Potato',
  'poisonous_potato': 'Poisonous_Potato',
  'bread': 'Bread',
  'cookie': 'Cookie',
  'cake': 'Cake',
  'pumpkin_pie': 'Pumpkin_Pie',
  'mushroom_stew': 'Mushroom_Stew',
  'beetroot_soup': 'Beetroot_Soup',
  'rabbit_stew': 'Rabbit_Stew',
  'suspicious_stew': 'Suspicious_Stew',
  'dried_kelp': 'Dried_Kelp',
  'cod': 'Raw_Cod',
  'salmon': 'Raw_Salmon',
  'tropical_fish': 'Tropical_Fish',
  'pufferfish': 'Pufferfish',
  'cooked_cod': 'Cooked_Cod',
  'cooked_salmon': 'Cooked_Salmon',
  'beef': 'Raw_Beef',
  'cooked_beef': 'Steak',
  'porkchop': 'Raw_Porkchop',
  'cooked_porkchop': 'Cooked_Porkchop',
  'chicken': 'Raw_Chicken',
  'cooked_chicken': 'Cooked_Chicken',
  'rabbit': 'Raw_Rabbit',
  'cooked_rabbit': 'Cooked_Rabbit',
  'mutton': 'Raw_Mutton',
  'cooked_mutton': 'Cooked_Mutton',
  'egg': 'Egg',
  'chorus_fruit': 'Chorus_Fruit',
  'popped_chorus_fruit': 'Popped_Chorus_Fruit',
  'snowball': 'Snowball',
  'ender_chest': 'Ender_Chest',
  'enchanting_table': 'Enchanting_Table',
  'crafting_table': 'Crafting_Table',
  'furnace': 'Furnace',
  'brewing_stand': 'Brewing_Stand',
  'cauldron': 'Cauldron',
  'anvil': 'Anvil',
  'grindstone': 'Grindstone',
  'smithing_table': 'Smithing_Table',
  'stonecutter': 'Stonecutter',
  'cartography_table': 'Cartography_Table',
  'fletching_table': 'Fletching_Table',
  'loom': 'Loom',
  'lectern': 'Lectern',
  'composter': 'Composter',
  'barrel': 'Barrel',
  'beehive': 'Beehive',
  'beacon': 'Beacon',
  'conduit': 'Conduit',
  'sculk_sensor': 'Sculk_Sensor',
  'sculk_shrieker': 'Sculk_Shrieker',
  'sculk_catalyst': 'Sculk_Catalyst',
  'reinforced_deepslate': 'Reinforced_Deepslate',
  'ender_chest': 'Ender_Chest',
  'shulker_box': 'Shulker_Box',
  'white_shulker_box': 'White_Shulker_Box',
  'campfire': 'Campfire',
  'soul_campfire': 'Soul_Campfire',
  'lantern': 'Lantern',
  'soul_lantern': 'Soul_Lantern',
  'torch': 'Torch',
  'soul_torch': 'Soul_Torch',
  'redstone_torch': 'Redstone_Torch',
  'jukebox': 'Jukebox',
  'note_block': 'Note_Block',
  'observer': 'Observer',
  'piston': 'Piston',
  'sticky_piston': 'Sticky_Piston',
  'dropper': 'Dropper',
  'dispenser': 'Dispenser',
  'hopper': 'Hopper',
  'target': 'Target',
  'daylight_detector': 'Daylight_Detector',
  'redstone_repeater': 'Redstone_Repeater',
  'redstone_comparator': 'Redstone_Comparator',
  'armor_stand': 'Armor_Stand',
  'item_frame': 'Item_Frame',
  'painting': 'Painting',
  'flower_pot': 'Flower_Pot',
  'compass': 'Compass',
  'clock': 'Clock',
  'shears': 'Shears',
  'shield': 'Shield',
  'fishing_rod': 'Fishing_Rod',
  'carrot_on_a_stick': 'Carrot_on_a_Stick',
  'warped_fungus_on_a_stick': 'Warped_Fungus_on_a_Stick',
  'lead': 'Lead',
  'map': 'Map',
  'name_tag': 'Name_Tag',
  'bucket': 'Bucket',
  'water_bucket': 'Water_Bucket',
  'lava_bucket': 'Lava_Bucket',
  'milk_bucket': 'Milk_Bucket',
  'powder_snow_bucket': 'Powder_Snow_Bucket',
  'cod_bucket': 'Bucket_of_Cod',
  'salmon_bucket': 'Bucket_of_Salmon',
  'tropical_fish_bucket': 'Bucket_of_Tropical_Fish',
  'pufferfish_bucket': 'Bucket_of_Pufferfish',
  'axolotl_bucket': 'Bucket_of_Axolotl',
  'tadpole_bucket': 'Bucket_of_Tadpole',
  'minecart': 'Minecart',
  'chest_minecart': 'Minecart_with_Chest',
  'furnace_minecart': 'Minecart_with_Furnace',
  'tnt_minecart': 'Minecart_with_TNT',
  'hopper_minecart': 'Minecart_with_Hopper',
  'sugar_cane': 'Sugar_Canes',
  'kelp': 'Kelp',
  'cactus': 'Cactus',
  'vine': 'Vines',
  'lily_pad': 'Lily_Pad',
  'grass_block': 'Grass_Block',
  'mycelium': 'Mycelium',
  'podzol': 'Podzol',
  'moss_block': 'Moss_Block',
  'moss_carpet': 'Moss_Carpet',
  'snow_block': 'Snow',
  'ice': 'Ice',
  'packed_ice': 'Packed_Ice',
  'blue_ice': 'Blue_Ice',
  'clay': 'Clay',
  'spawner': 'Monster_Stones',
  'end_portal_frame': 'End_Portal_Frame',
  'dragon_egg': 'Dragon_Egg',
  'end_crystal': 'End_Crystal',
  'chorus_flower': 'Chorus_Flower',
  'chorus_plant': 'Chorus_Plant',
  'farmland': 'Farmland',
  'soul_sand': 'Soul_Sand',
  'soul_soil': 'Soul_Soil',
  'obsidian': 'Obsidian',
  'crying_obsidian': 'Crying_Obsidian',
  'glowstone': 'Glowstone',
  'sea_lantern': 'Sea_Lantern',
  'jack_o_lantern': 'Jack_o_Lantern',
  'melon': 'Melon',
  'pumpkin': 'Pumpkin',
  'carved_pumpkin': 'Carved_Pumpkin',
  'jack_o_lantern': 'Jack_o_Lantern',
  'bookshelf': 'Bookshelf',
  'ladder': 'Ladder',
  'rail': 'Rail',
  'powered_rail': 'Powered_Rail',
  'detector_rail': 'Detector_Rail',
  'activator_rail': 'Activator_Rail',
  'glass': 'Glass',
  'glass_pane': 'Glass_Pane',
  'iron_bars': 'Iron_Bars',
  'tnt': 'TNT',
};

function toWikiName(item) {
  // 先查覆盖表
  if (OVERRIDES[item]) return OVERRIDES[item];
  // 默认: PascalCase
  return item.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
}

function toFilename(item) {
  return item + '.png';
}

function wikiUrl(item) {
  return 'https://minecraft.wiki/images/Invicon_' + toWikiName(item) + '.png';
}

// ====== HTTP 请求（支持代理） ======
const tls = require('tls');
const net = require('net');
function httpGet(url, destPath) {
  return new Promise(resolve => {
    if (!PROXY) {
      // 直连 HTTPS
      const file = fs.createWriteStream(destPath);
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'image/*,*/*;q=0.8', 'Referer': 'https://minecraft.wiki/' } }, res => {
        if (res.statusCode === 200) { res.pipe(file); file.on('finish', () => { file.close(); resolve(true) }); }
        else { file.close(); try { fs.unlinkSync(destPath) } catch(e){} resolve(false) }
      }).on('error', () => { try { fs.unlinkSync(destPath) } catch(e){} resolve(false) });
      return;
    }
    // 通过 HTTP 代理连接 HTTPS (CONNECT 隧道)
    const u = new URL(url);
    const file = fs.createWriteStream(destPath);
    const conn = net.connect(PROXY.port, PROXY.host, () => {
      conn.write('CONNECT ' + u.host + ':443 HTTP/1.1\r\nHost: ' + u.host + '\r\nProxy-Connection: Keep-Alive\r\n\r\n');
    });
    let tunneled = false;
    conn.on('data', data => {
      if (!tunneled && data.toString().includes('200')) {
        tunneled = true;
        const tlsSocket = tls.connect({ socket: conn, servername: u.host }, () => {
          const req = tlsSocket.write('GET ' + url + ' HTTP/1.1\r\nHost: ' + u.host + '\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\r\nAccept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8\r\nReferer: https://minecraft.wiki/\r\nConnection: close\r\n\r\n');
        });
        let buf = '', headerDone = false, statusOk = false;
        tlsSocket.on('data', d => {
          if (!headerDone) {
            buf += d.toString();
            const idx = buf.indexOf('\r\n\r\n');
            if (idx !== -1) {
              headerDone = true;
              const header = buf.substring(0, idx);
              statusOk = header.includes('200');
              if (statusOk) {
                const body = buf.substring(idx + 4);
                if (body.length > 0) file.write(Buffer.from(body, 'binary'));
              } else {
                file.close(); try { fs.unlinkSync(destPath) } catch(e){} resolve(false);
              }
            }
          } else if (statusOk) {
            file.write(Buffer.from(d, 'binary'));
          }
        });
        tlsSocket.on('end', () => { if (statusOk) { file.end(); file.on('finish', () => resolve(true)); } });
        tlsSocket.on('error', () => { try { fs.unlinkSync(destPath) } catch(e){} resolve(false) });
      }
    });
    conn.on('error', () => { try { fs.unlinkSync(destPath) } catch(e){} resolve(false) });
  });
}

// ====== 主流程 ======
async function main() {
  // 读取所有需要图片的物品
  const items = JSON.parse(fs.readFileSync('/tmp/all_items.json', 'utf8'));
  console.log(`需要下载 ${items.length} 个物品图标，并发数 ${CONCURRENCY}`);

  // 确保目录存在
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

  let ok = 0, fail = 0, skip = 0;
  const failures = [];

  // 并发下载
  async function download(item) {
    const filePath = IMG_DIR + '/' + toFilename(item);
    // 已有文件则跳过
    if (fs.existsSync(filePath)) { skip++; return; }
    const url = wikiUrl(item);
    const success = await httpGet(url, filePath);
    if (success) {
      ok++;
      if (ok % 50 === 0) console.log(`  ... ${ok} OK, ${fail} 失败`);
    } else {
      fail++;
      failures.push(item);
      try { fs.unlinkSync(filePath) } catch(e) {}
    }
  }

  // 批次执行
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(download));
    const pct = ((i + batch.length) / items.length * 100).toFixed(1);
    process.stdout.write(`\r  进度: ${Math.min(i + batch.length, items.length)}/${items.length} (${pct}%) | ✅ ${ok} | ❌ ${fail} | ⏭ ${skip}`);
  }

  console.log('\n\n===== 完成 =====');
  console.log(`✅ 成功: ${ok}`);
  console.log(`❌ 失败: ${fail}`);
  console.log(`⏭ 跳过(已有): ${skip}`);
  if (failures.length > 0) {
    console.log('\n失败的物品:');
    failures.forEach(f => console.log(`  ${f} -> ${wikiUrl(f)}`));
    fs.writeFileSync(IMG_DIR + '/../download_failures.json', JSON.stringify(failures, null, 2));
    console.log('失败列表已保存到 download_failures.json');
  }
}

main().catch(console.error);
