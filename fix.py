content = open('src/app/mi-perfil/page.tsx', 'rb').read()
fixed = content.replace(b'\xe2\x80\x9c', b'"').replace(b'\xe2\x80\x9d', b'"').replace(b'\xe2\x80\x98', b"'").replace(b'\xe2\x80\x99', b"'")
open('src/app/mi-perfil/page.tsx', 'wb').write(fixed)
print('OK - bytes fixed')
