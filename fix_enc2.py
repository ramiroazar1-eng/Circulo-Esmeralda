content = open("fix_modal.py", "rb").read()
content = content.replace(b"\x97", b"-")
open("fix_modal.py", "wb").write(content)
print("OK")
