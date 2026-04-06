content = open("src/app/mi-perfil/PedidosWidget.tsx", "r", encoding="utf-8").read()
# El widget ya calcula usedGrams desde props, solo verificar que se muestre
print("usedGrams en widget:", "usedGrams" in content)
print(content[content.find("availableGrams"):content.find("availableGrams")+100])
