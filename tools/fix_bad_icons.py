#!/usr/bin/env python3
"""修复所有无效的 PNG 图标，尝试多种命名模式查找 Wiki CDN 上的正确图标。"""

import subprocess, os, sys

IMAGES_DIR = "/Users/chen/dev/material_html/images"
WIKI_CDN = "https://minecraft.wiki/images"
HEADERS = [
    "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "-H", "Accept: image/*",
    "-H", "Referer: https://minecraft.wiki/",
]

def curl_check(url):
    """检查 URL 是否存在（返回 HTTP 200）"""
    r = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}"] + HEADERS + [url],
        capture_output=True, text=True, timeout=15
    )
    return r.stdout.strip() == "200"

def curl_download(url, filepath):
    """下载文件"""
    subprocess.run(
        ["curl", "-s", "-o", filepath] + HEADERS + [url],
        capture_output=True, timeout=30
    )

def to_title(s):
    """将 snake_case 转为 Title_Case"""
    return s.replace("_", " ").title().replace(" ", "_")

def main():
    # 找出所有坏文件
    bad_items = []
    for f in os.listdir(IMAGES_DIR):
        if not f.endswith(".png"):
            continue
        filepath = os.path.join(IMAGES_DIR, f)
        with open(filepath, "rb") as fh:
            magic = fh.read(4)
        if magic != b"\x89PNG":
            name = f[:-4]
            bad_items.append(name)
    
    print(f"找到 {len(bad_items)} 个无效文件")
    
    # 为每个坏文件尝试多种命名模式
    fixed_count = 0
    not_found = []
    
    for item in bad_items:
        filepath = os.path.join(IMAGES_DIR, item + ".png")
        title_name = to_title(item)
        
        # 尝试的命名模式列表
        patterns = [
            # 模式 1: 标准 Invicon_<Title>.png
            f"Invicon_{title_name}.png",
        ]
        
        # 特殊规则
        if item.endswith("_armor_trim_smithing_template"):
            # 锻造模板: Invicon_<Name>_Armor_Trim.png
            base = item.replace("_armor_trim_smithing_template", "")
            patterns.append(f"Invicon_{to_title(base)}_Armor_Trim.png")
        
        if item == "netherite_upgrade_smithing_template":
            patterns.append("Invicon_Netherite_Upgrade.png")
        
        if item == "writable_book":
            patterns.append("Invicon_Book_and_Quill.png")
        
        if item == "sugar_cane":
            patterns.append("Invicon_Sugar_Cane_JE1_BE1.png")
            patterns.append("Invicon_Sugar_Canes.png")
        
        if item == "chain":
            patterns.append("Chain_JE2_BE2.png")
            patterns.append("Chain_JE1_BE1.png")
            
        if item.endswith("_chest_boat"):
            # 箱子船可能没有独立图标
            pass
            
        if item.endswith("_banner_pattern"):
            # 旗帜图案可能没有独立图标
            pass
            
        if item.startswith("waxed_"):
            # 蜡质铜可能没有独立图标（与原版铜共用）
            pass
            
        if item in ["crimson_hyphae", "crimson_log", "crimson_stem",
                      "warped_hyphae", "warped_log", "warped_stem",
                      "stripped_crimson_log", "stripped_warped_log",
                      "stripped_bamboo_block"]:
            # 下界木头方块可能没有 Invicon
            pass
        
        if item in ["clock", "compass"]:
            # 时钟指南针可能没有静态 PNG（可能是 GIF）
            pass
        
        if item in ["calibrated_sculk_sensor", "sculk_sensor", "stonecutter",
                     "carrot_on_a_stick", "flint_and_steel", "recovery_compass",
                     "warped_fungus_on_a_stick", "turtle_helmet",
                     "leather_chestplate", "leather_helmet", "leather_leggings",
                     "enchanted_golden_apple", "lily_of_the_valley",
                     "heart_of_the_sea", "end_crystal", "jack_o_lantern",
                     "hay_block", "magma_block", "sea_lantern",
                     "amethyst_block", "bamboo_block", "tnt",
                     "prismarine", "prismarine_slab", "prismarine_stairs", "prismarine_wall",
                     "copper_block", "repeater", "comparator",
                     "nether_star", "resin_block"]:
            pass  # 这些先试标准模式
        
        # 尝试所有模式
        found = False
        for pattern in patterns:
            url = f"{WIKI_CDN}/{pattern}"
            if curl_check(url):
                print(f"  ✅ {item} → {pattern}")
                curl_download(url, filepath)
                # 验证下载成功
                with open(filepath, "rb") as fh:
                    magic = fh.read(4)
                if magic == b"\x89PNG":
                    fixed_count += 1
                    found = True
                    break
                else:
                    print(f"  ⚠️  {item} 下载了但仍是无效文件")
        
        if not found:
            not_found.append(item)
            # 删除无效文件，让浏览器用 imgFB() 回退
            os.remove(filepath)
            print(f"  ❌ {item} - 未找到，已删除（将使用回退图标）")
    
    print(f"\n=== 统计 ===")
    print(f"修复: {fixed_count}")
    print(f"未找到（已删除）: {len(not_found)}")
    if not_found:
        print(f"未找到列表:")
        for item in not_found:
            print(f"  - {item}")

if __name__ == "__main__":
    main()
