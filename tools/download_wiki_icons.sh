#!/bin/bash
# 从 Minecraft Wiki CDN 下载立体物品图标（基于 xargs 高并发）
set -e
cd "$(dirname "$0")/.."
IMGDIR="images"
CONCURRENCY="${1:-50}"
mkdir -p "$IMGDIR"

# 生成下载列表: item_name wiki_name
node -e "
const items=JSON.parse(require('fs').readFileSync('/tmp/all_items.json','utf8'));
const ov=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
items.forEach(i=>{
  const wn=ov[i]||i.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join('_');
  console.log(i,wn);
});
" <(node -e "
console.log(JSON.stringify({
  iron_block:'Block_of_Iron',gold_block:'Block_of_Gold',diamond_block:'Block_of_Diamond',
  emerald_block:'Block_of_Emerald',redstone_block:'Block_of_Redstone',
  lapis_block:'Block_of_Lapis_Lazuli',coal_block:'Block_of_Coal',
  netherite_block:'Block_of_Netherite',
  raw_iron_block:'Block_of_Raw_Iron',raw_gold_block:'Block_of_Raw_Gold',raw_copper_block:'Block_of_Raw_Copper',
  quartz_block:'Block_of_Quartz',smooth_quartz:'Smooth_Quartz',smooth_stone:'Smooth_Stone',
  smooth_sandstone:'Smooth_Sandstone',smooth_red_sandstone:'Smooth_Red_Sandstone',
  quartz:'Nether_Quartz',nether_quartz:'Nether_Quartz',
  bone_meal:'Bone_Meal',light_gray_dye:'Light_Gray_Dye',
  iron_ingot:'Iron_Ingot',gold_ingot:'Gold_Ingot',gold_nugget:'Gold_Nugget',iron_nugget:'Iron_Nugget',
  netherite_ingot:'Netherite_Ingot',netherite_scrap:'Netherite_Scrap',copper_ingot:'Copper_Ingot',
  raw_iron:'Raw_Iron',raw_gold:'Raw_Gold',raw_copper:'Raw_Copper',
  redstone:'Redstone',lapis_lazuli:'Lapis_Lazuli',bone:'Bone',stick:'Stick',
  coal:'Coal',charcoal:'Charcoal',diamond:'Diamond',emerald:'Emerald',
  ender_eye:'Eye_of_Ender',experience_bottle:'Bottle_o_Enchanting',
  slime_ball:'Slimeball',sugar_cane:'Sugar_Canes',snow_block:'Snow',
  spawner:'Monster_Stones',grass_block:'Grass_Block',
  cooked_beef:'Steak',cod:'Raw_Cod',salmon:'Raw_Salmon',
  beef:'Raw_Beef',porkchop:'Raw_Porkchop',chicken:'Raw_Chicken',
  rabbit:'Raw_Rabbit',mutton:'Raw_Mutton',
  cooked_porkchop:'Cooked_Porkchop',cooked_chicken:'Cooked_Chicken',
  cooked_rabbit:'Cooked_Rabbit',cooked_mutton:'Cooked_Mutton',
  melon_slice:'Melon',vine:'Vines',lily_pad:'Lily_Pad',
  minecart:'Minecart',chest_minecart:'Minecart_with_Chest',
  furnace_minecart:'Minecart_with_Furnace',tnt_minecart:'Minecart_with_TNT',
  hopper_minecart:'Minecart_with_Hopper',
  cod_bucket:'Bucket_of_Cod',salmon_bucket:'Bucket_of_Salmon',
  tropical_fish_bucket:'Bucket_of_Tropical_Fish',pufferfish_bucket:'Bucket_of_Pufferfish',
  axolotl_bucket:'Bucket_of_Axolotl',tadpole_bucket:'Bucket_of_Tadpole',
  clay_ball:'Clay_Ball'
}))
")) > /tmp/wiki_download_list.txt

TOTAL=$(wc -l < /tmp/wiki_download_list.txt)
echo "需要下载 $TOTAL 个物品图标，并发数 $CONCURRENCY"
echo "开始下载..."

# 用 xargs 高并发
cat /tmp/wiki_download_list.txt | xargs -P"$CONCURRENCY" -I{} sh -c '
  item=$(echo "{}" | cut -d" " -f1)
  wname=$(echo "{}" | cut -d" " -f2)
  file="images/${item}.png"
  [ -f "$file" ] && exit 0
  url="https://minecraft.wiki/images/Invicon_${wname}.png"
  curl -s -o "$file" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    -H "Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8" \
    -H "Referer: https://minecraft.wiki/" \
    --connect-timeout 10 --max-time 15 \
    "$url" 2>/dev/null
  sz=$(stat -f%z "$file" 2>/dev/null || echo 0)
  if [ "$sz" -lt 50 ]; then rm -f "$file"; fi
' 2>/dev/null

echo ""
OK=$(ls "$IMGDIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
echo "===== 完成: $OK / $TOTAL ====="
