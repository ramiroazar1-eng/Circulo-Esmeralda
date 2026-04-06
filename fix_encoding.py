# -*- coding: utf-8 -*-
content = open("fix_widget.py", "rb").read()
content = content.replace(b"\x97", b"-")
open("fix_widget.py", "wb").write(content)
print("OK fixed")
