import re

filepath = 'src/components/ChinesaDetail.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

replacements = [
    (r'\bPlatformDetail\b', 'ChinesaDetail'),
    (r'\bplatform\b', 'chinesa'),
    (r'\bPlatform\b', 'Chinesa'),
    (r'\bplatforms\b', 'chinesas'),
    (r'\bPlatforms\b', 'Chinesas'),
    (r'\bplataforma\b', 'chinesa'),
    (r'\bPlataforma\b', 'Chinesa'),
    (r'\bplataformas\b', 'chinesas'),
    (r'\bPlataformas\b', 'Chinesas')
]

for old, new in replacements:
    code = re.sub(old, new, code)

# Ensure platform_id is changed to chinesa_id
code = re.sub(r'platform_id', 'chinesa_id', code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print('Replacement complete.')
