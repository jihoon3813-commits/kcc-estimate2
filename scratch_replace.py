import io

path = r"d:\anti-gv\11. KCC 견적계산(책임견적)\src\components\CustomerPage.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

count = content.count("f.storageId ? f.url || '#' : URL.createObjectURL(f.file)")
print(f"Found {count} instances.")

# Replace 1
content = content.replace(
    "f.storageId ? f.url || '#' : URL.createObjectURL(f.file)",
    "f.url || (f.file ? URL.createObjectURL(f.file) : '#')"
)

# Replace 2 (handleFileUpload)
content = content.replace(
    "return { name: file.name, storageId };",
    "return { name: file.name, storageId, file };"
)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done replacing.")
