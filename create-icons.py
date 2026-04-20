#!/usr/bin/env python3
"""
Generate placeholder PNG icons for ClawClip.
Uses only Python standard library — no dependencies.
Output: solid purple (#7c3aed) squares at 16, 32, 48, and 128 px.
Replace the PNGs in icons/ with real artwork before publishing.
"""
import os, zlib, struct

def make_png(size, r, g, b):
    """Returns the bytes of a valid PNG image: solid RGB colour, no alpha."""

    def chunk(tag, data):
        payload = tag + data
        crc = zlib.crc32(payload) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)

    # IHDR: width, height, bit depth 8, colour type 2 (RGB), compression/filter/interlace 0
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))

    # Raw image data: one filter byte (0 = None) per row, then RGB triples
    row = b'\x00' + bytes([r, g, b]) * size
    raw = row * size
    idat = chunk(b'IDAT', zlib.compress(raw, 9))

    iend = chunk(b'IEND', b'')

    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend


if __name__ == '__main__':
    os.makedirs('icons', exist_ok=True)
    for size in (16, 32, 48, 128):
        path = f'icons/icon{size}.png'
        with open(path, 'wb') as f:
            f.write(make_png(size, 124, 58, 237))   # #7c3aed
        print(f'  created {path}')
    print('Done. Replace icons/ with real artwork before publishing.')
