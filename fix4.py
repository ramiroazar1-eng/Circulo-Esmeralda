with open("src/app/dashboard/page.tsx", "rb") as f:
    raw = f.read()

# Mostrar contexto de cada ocurrencia
idx = 0
while True:
    pos = raw.find(b"\xc3\x83", idx)
    if pos == -1:
        break
    context = raw[max(0,pos-20):pos+40]
    print(f"pos {pos}: {context}")
    idx = pos + 1
