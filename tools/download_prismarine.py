#!/usr/bin/env python3
"""从 PrismarineJS/minecraft-assets 下载平面纹理，补全缺少的 96 个物品图标。"""

import subprocess, os, sys, concurrent.futures

IMAGES_DIR = "/Users/chen/dev/material_html/images"
GH_BASE = "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.6"
PROXY = "http://192.168.25.10:5683"

# 需要下载的 96 个物品
MISSING_ITEMS = [
    "acacia_chest_boat","amethyst_block","bamboo_block","bamboo_chest_raft",
    "birch_chest_boat","bordure_indented_banner_pattern","calibrated_sculk_sensor",
    "carrot_on_a_stick","chain","cherry_chest_boat","clock","comparator","compass",
    "copper_block","creeper_banner_pattern","crimson_hyphae","crimson_log",
    "crimson_stem","dark_oak_chest_boat","enchanted_golden_apple","end_crystal",
    "field_masoned_banner_pattern","flint_and_steel","flower_banner_pattern",
    "hay_block","heart_of_the_sea","jack_o_lantern","jungle_chest_boat",
    "leather_chestplate","leather_helmet","leather_leggings","lily_of_the_valley",
    "magenta_stained_glass","magma_block","mangrove_chest_boat","mojang_banner_pattern",
    "nether_star","oak_chest_boat","pale_oak_chest_boat","prismarine",
    "prismarine_slab","prismarine_stairs","prismarine_wall","recovery_compass",
    "repeater","resin_block","sculk_sensor","sea_lantern","skull_banner_pattern",
    "spruce_chest_boat","stonecutter","stripped_bamboo_block","stripped_crimson_log",
    "stripped_warped_log","tnt","turtle_helmet","warped_fungus_on_a_stick",
    "warped_hyphae","warped_log","warped_stem","waxed_chiseled_copper",
    "waxed_copper_block","waxed_copper_bulb","waxed_copper_door","waxed_copper_grate",
    "waxed_copper_trapdoor","waxed_cut_copper","waxed_cut_copper_slab",
    "waxed_cut_copper_stairs","waxed_exposed_chiseled_copper","waxed_exposed_copper",
    "waxed_exposed_copper_bulb","waxed_exposed_copper_door","waxed_exposed_copper_grate",
    "waxed_exposed_copper_trapdoor","waxed_exposed_cut_copper",
    "waxed_exposed_cut_copper_slab","waxed_exposed_cut_copper_stairs",
    "waxed_oxidized_chiseled_copper","waxed_oxidized_copper",
    "waxed_oxidized_copper_bulb","waxed_oxidized_copper_door",
    "waxed_oxidized_copper_grate","waxed_oxidized_copper_trapdoor",
    "waxed_oxidized_cut_copper","waxed_oxidized_cut_copper_slab",
    "waxed_oxidized_cut_copper_stairs","waxed_weathered_chiseled_copper",
    "waxed_weathered_copper","waxed_weathered_copper_bulb",
    "waxed_weathered_copper_door","waxed_weathered_copper_grate",
    "waxed_weathered_copper_trapdoor","waxed_weathered_cut_copper",
    "waxed_weathered_cut_copper_slab","waxed_weathered_cut_copper_stairs",
]

def curl_download(url, dest, use_proxy=False):
    """下载文件，可选代理"""
    cmd = ["curl", "-sfL", "--max-time", "15"]
    if use_proxy:
        cmd += ["--proxy", PROXY]
    cmd += ["-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"]
    cmd += ["-o", dest, url]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    return result.returncode == 0

def try_head(url, use_proxy=False):
    """检查 URL 是否存在"""
    cmd = ["curl", "-sfLI", "--max-time", "8"]
    if use_proxy:
        cmd += ["--proxy", PROXY]
    cmd += ["-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{http_code}", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return result.stdout.strip() == "200"
    except:
        return False

def download_item(item_name):
    """尝试从 PrismarineJS 下载单个物品纹理"""
    filepath = os.path.join(IMAGES_DIR, item_name + ".png")
    if os.path.exists(filepath):
        # 检查是否有效 PNG
        with open(filepath, "rb") as f:
            if f.read(4) == b"\x89PNG":
                return f"⏭️  {item_name} - 已存在"
    
    # 尝试 blocks 目录
    for use_proxy in [False, True]:
        url = f"{GH_BASE}/blocks/{item_name}.png"
        if try_head(url, use_proxy):
            if curl_download(url, filepath, use_proxy):
                with open(filepath, "rb") as f:
                    if f.read(4) == b"\x89PNG":
                        return f"✅ {item_name} - blocks"
        # 尝试 items 目录
        url = f"{GH_BASE}/items/{item_name}.png"
        if try_head(url, use_proxy):
            if curl_download(url, filepath, use_proxy):
                with open(filepath, "rb") as f:
                    if f.read(4) == b"\x89PNG":
                        return f"✅ {item_name} - items"
    
    return f"❌ {item_name} - 未找到"

def main():
    print(f"需要下载 {len(MISSING_ITEMS)} 个缺少的纹理\n")
    
    success = 0
    failed = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_item, item): item for item in MISSING_ITEMS}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            print(result)
            if result.startswith("✅"):
                success += 1
            elif result.startswith("❌"):
                failed += 1
    
    print(f"\n=== 完成 ===")
    print(f"成功: {success}, 失败: {failed}")
    
    # 最终统计
    valid = 0
    invalid = 0
    for f in os.listdir(IMAGES_DIR):
        if f.endswith(".png"):
            with open(os.path.join(IMAGES_DIR, f), "rb") as fh:
                if fh.read(4) == b"\x89PNG":
                    valid += 1
                else:
                    invalid += 1
    print(f"最终: {valid} 有效 PNG, {invalid} 无效")

if __name__ == "__main__":
    main()
