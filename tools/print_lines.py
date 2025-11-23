from pathlib import Path
p=Path('portfolio/templates/base.html')
text=p.read_text(encoding='utf-8')
for i,line in enumerate(text.splitlines(),start=1):
    print(f"{i:04d}: {line!r}")
