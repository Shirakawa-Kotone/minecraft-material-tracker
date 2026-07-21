#!/usr/bin/env python3
"""查找并下载方块的 3D 等轴渲染图，替换平面纹理。"""
import subprocess, os, concurrent.futures

IMAGES_DIR = "/Users/chen/dev/material_html/images"
WIKI_CDN = "https://minecraft.wiki/images"

HEADERS = [
    "-H", "Referer: https://minecraft.wiki/",
    "-H", "Accept: image/*",
    "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
]

# 需要替换的物品及可尝试的基础名
ITEMS = {
    # 平面方块
    "amethyst_block": ["Amethyst_Block"],
    "bamboo_block": ["Bamboo_Block"],
    "calibrated_sculk_sensor": ["Calibrated_Sculk_Sensor"],
    "copper_block": ["Copper_Block", "Block_of_Copper"],
    "hay_block": ["Hay_Block"],
    "jack_o_lantern": ["Jack_o_Lantern", "Jack_O_Lantern"],
    "repeater": ["Redstone_Repeater"],
    "resin_block": ["Resin_Block"],
    "stripped_crimson_log": ["Stripped_Crimson_Stem", "Stripped_Crimson_Log"],
    "stripped_warped_log": ["Stripped_Warped_Stem", "Stripped_Warped_Log"],
    "waxed_copper_block": ["Waxed_Copper_Block", "Block_of_Waxed_Copper"],
    # 多面堆叠
    "crimson_log": ["Crimson_Stem", "Crimson_Log"],
    "crimson_stem": ["Crimson_Stem"],
    "magma_block": ["Magma_Block"],
    "prismarine": ["Prismarine"],
    "prismarine_slab": ["Prismarine_Slab"],
    "prismarine_stairs": ["Prismarine_Stairs"],
    "prismarine_wall": ["Prismarine_Wall"],
    "sea_lantern": ["Sea_Lantern"],
    "warped_hyphae": ["Warped_Hyphae"],
    "warped_log": ["Warped_Stem", "Warped_Log"],
    "warped_stem": ["Warped_Stem"],
}

SUFFIXES = ["", "_JE1", "_JE2", "_JE3", "_JE1_BE1", "_JE2_BE2", "_BE1", "_BE2"]

def check_url(url):
    r = subprocess.run(["curl", "-sI", "--max-time", "6", "-o", "/dev/null", "-w", "%{http_code}"] + HEADERS + [url],
                       capture_output=True, text=True, timeout=10)
    return r.stdout.strip() == "200"

def download_url(url, dest):
    subprocess.run(["curl", "-sfL", "--max-time", "15"] + HEADERS + ["-o", dest, url],
                   capture_output=True, timeout=20)

def process_item(item):
    filepath = os.path.join(IMAGES_DIR, item + ".png")
    base_names = ITEMS[item]
    
    for base in base_names:
        for suffix in SUFFIXES:
            name = f"{base}{suffix}.png"
            url = f"{WIKI_CDN}/{name}"
            if check_url(url):
                download_url(url, filepath)
                # 验证
                with open(filepath, "rb") as f:
                    magic = f.read(4)
                if magic == b"\x89PNG":
                    # 检查尺寸
                    with open(filepath, "rb") as f:
                        f.seek(16)
                        import struct
                        w, h = struct.unpack(">II", f.read(8))
                    return f"✅ {item} → {name} ({w}x{h})"
    return f"❌ {item} - 未找到"

def main():
    print("查找 3D 方块渲染图...\n")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(process_item, item): item for item in ITEMS}
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            print(r)
            results.append(r)
    
    print(f"\n=== 完成 ===")
    ok = sum(1 for r in results if r.startswith("✅"))
    fail = sum(1 for r in results if r.startswith("❌"))
    print(f"成功: {ok}, 失败: {fail}")
    
    # 最终验证尺寸
    print("\n=== 尺寸检查 ===")
    for item in ITEMS:
        fp = os.path.join(IMAGES_DIR, item + ".png")
        if os.path.exists(fp):
            with open(fp, "rb") as f:
                f.seek(16)
                import struct
                w, h = struct.unpack(">II", f.read(8))
            status = "✅" if w >= 16 and h >= 16 else "⚠️"
            print(f"  {status} {item}.png → {w}x{h}")

if __name__ == "__main__":
    main()
