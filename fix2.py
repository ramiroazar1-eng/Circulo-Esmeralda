content = open("src/app/mi-perfil/page.tsx", "rb").read()
for i, b in enumerate(content):
    if b > 127:
        print(f"Byte {b} (0x{b:02x}) at position {i}: context = {content[max(0,i-10):i+10]}")
