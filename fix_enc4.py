content = open("create_sig_apis.py", "rb").read()
content = content.replace(b"\x97", b"-")
open("create_sig_apis.py", "wb").write(content)
print("OK")
