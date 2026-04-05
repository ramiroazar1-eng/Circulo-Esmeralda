content = open("src/app/mi-perfil/page.tsx", "rb").read()
fixed = content.replace(b"\xf1", b"n").replace(b"\xb7", b"*")
open("src/app/mi-perfil/page.tsx", "wb").write(fixed)
print("OK")
