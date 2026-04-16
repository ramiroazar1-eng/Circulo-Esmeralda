with open("src/app/dashboard/page.tsx", "rb") as f:
    raw = f.read()

fixed = raw
# Em dash corrupto (—)
fixed = fixed.replace(
    b"\xc3\x83\xc6\x92\xc3\x82\xc2\xa2\xc3\x83\xc2\xa2\xc3\xa2\xe2\x82\xac\xc5\xa1\xc3\x82\xc2\xac\xc3\x83\xc2\xa2\xc3\xa2\xe2\x80\x9a\xc2\xac\xc3\x82\xc2\x9d",
    b"\xe2\x80\x94"
)
# Punto medio corrupto variante 1 (·)
fixed = fixed.replace(
    b"\xc3\x83\xc6\x92\xc3\xa2\xe2\x82\xac\xc5\xa1\xc2\xb7",
    b"\xc2\xb7"
)

with open("src/app/dashboard/page.tsx", "wb") as f:
    f.write(fixed)

remaining = fixed.count(b"\xc3\x83")
print(f"Done. Remaining: {remaining}")
