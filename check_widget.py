# -*- coding: utf-8 -*-
content = open("src/app/mi-perfil/PedidosWidget.tsx", "r", encoding="utf-8").read()
print("Lineas actuales:", len(content.splitlines()))
print("Tiene CartItem:", "CartItem" in content)
