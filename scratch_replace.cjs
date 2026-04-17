const fs = require('fs');
const path = 'd:/anti-gv/11. KCC 견적계산(책임견적)/src/components/CustomerPage.jsx';

let content = fs.readFileSync(path, 'utf8');

const searchStr = "f.storageId ? f.url || '#' : URL.createObjectURL(f.file)";
const targetCount = content.split(searchStr).length - 1;
console.log("Found " + targetCount + " instances.");

content = content.split(searchStr).join("f.url || (f.file ? URL.createObjectURL(f.file) : '#')");

const searchStr2 = "return { name: file.name, storageId };";
content = content.split(searchStr2).join("return { name: file.name, storageId, file };");

fs.writeFileSync(path, content, 'utf8');
console.log("Done replacing.");
