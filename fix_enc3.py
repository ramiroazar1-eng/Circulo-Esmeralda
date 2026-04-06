content = open("fix_link.py", "rb").read()
content = content.replace(b"\x97", b"-")
open("fix_link.py", "wb").write(content)
print("OK")
