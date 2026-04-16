with open("src/app/dashboard/page.tsx", "rb") as f:
    raw = f.read()

# Ver bytes alrededor de las ocurrencias problematicas
content = raw.decode("utf-8")

# Reemplazar todas las secuencias de encoding corrupto por el caracter correcto
import re

# El punto medio corrupto aparece como secuencias largas de Ã
# Detectar y reemplazar
bad_sequences = []
for m in re.finditer(r"[\xc3][\x83][\xc2][\x82][\xc3][\x82][\xc2][\xb7]", raw):
    bad_sequences.append(m.start())

print(f"Found {len(bad_sequences)} bad sequences")

# Reemplazar en el contenido
fixed = raw
fixed = fixed.replace(b"\xc3\x83\xc2\x82\xc3\x82\xc2\xb7", "\xc2\xb7".encode())
fixed = fixed.replace(b"\xc3\x83\xc6\x92\xc3\xa2\xe2\x82\xac\xc5\xa1\xc3\x83\xc2\xa2\xc3\x82\xc2\xb7", "\xc2\xb7".encode())
fixed = fixed.replace(b"\xc3\x83\xc6\x92\xc3\xa2\xe2\x82\xac\xe2\x80\x9c\xc3\x83\xe2\x80\x9a\xc3\x82\xc2\xb7", "\xc2\xb7".encode())

# Em dash corrupto
fixed = fixed.replace(b"\xc3\x83\xc6\x92\xc3\xa2\xe2\x82\xac\xc5\xa1\xc3\x83\xc2\xa2\xc3\x82\xc2\xb7", "\xc2\xb7".encode())
fixed = fixed.replace(b"\xc3\x83\xc2\xa2\xc3\xa2\xc2\x80\xc2\x94", "\xe2\x80\x94".encode())

with open("src/app/dashboard/page.tsx", "wb") as f:
    f.write(fixed)

print("Done - check diff")
