import json
import re
from pathlib import Path
text = Path('/home/ubuntu/nv_admin_work/api/login.js').read_text()
names = re.findall(r"username:\s*'([^']+)'", text)
Path('/home/ubuntu/nv_admin_work/api/legacy-usernames.json').write_text(json.dumps(sorted(set(names)), ensure_ascii=False, indent=2) + '\n')
