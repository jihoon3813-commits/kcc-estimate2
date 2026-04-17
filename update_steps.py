import re

with open('src/components/CustomerPage.jsx', 'r', encoding='utf8') as f:
    content = f.read()

# 1. Update Step 1 rendering condition
content = content.replace('{rentalStep === 1 && (', '{(applicationType !== \"green_remodeling\" || (applicationType === \"green_remodeling\" && greenFlowMode === \"pre\")) && rentalStep === 1 && (')

# 2. Update Subscription step logic since it uses early returns or conditions
pass

with open('src/components/CustomerPage.jsx', 'w', encoding='utf8') as f:
    f.write(content)
