import os

for root, dirs, files in os.walk("src"):
    for f in files:
        if not (f.endswith(".tsx") or f.endswith(".ts")):
            continue
        path = os.path.join(root, f)
        try:
            with open(path, "r", encoding="utf-8") as fp:
                content = fp.read()
            # Fix caracteres mal encodados
            replacements = {
                "\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00c2\u0082\u00c2\u00ac\u00c3\u00a2\u00c2\u0080\u00c2\u009c": "\u00b7",
                "Lote {d.lot?.lot_code ?? \"-\"} \u00c3\u0083\u00c2\u0082\u00c3\u0082\u00c2\u00b7 {formatDate(d.dispensed_at)}": "Lote {d.lot?.lot_code ?? \"-\"} \u00b7 {formatDate(d.dispensed_at)}",
                "{formatDate(entry.entry_date)} \u00c3\u0083\u00c2\u0082\u00c3\u0082\u00c2\u00b7 {(entry as any)": "{formatDate(entry.entry_date)} \u00b7 {(entry as any)",
            }
            new_content = content
            for bad, good in replacements.items():
                new_content = new_content.replace(bad, good)
            # Buscar cualquier secuencia de Ã
            import re
            if "\u00c3\u0083" in new_content or "\u00c3\u00a2" in new_content:
                new_content = new_content.replace("\u00c3\u0083\u00c2\u0082\u00c3\u0082\u00c2\u00b7", "\u00b7")
                new_content = new_content.replace("\u00c3\u00a2\u00c2\u0080\u00c2\u009c", "")
            if new_content != content:
                with open(path, "w", encoding="utf-8") as fp:
                    fp.write(new_content)
                print(f"Fixed: {path}")
        except Exception as e:
            print(f"Error {path}: {e}")

print("Done")
