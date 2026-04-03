#!/usr/bin/env bash
set -euo pipefail

# ---- CONFIG ----
FRONTEND_DIR="$(pwd)"   # since you're already inside frontend folder
DASH_FILE="$FRONTEND_DIR/src/pages/Dashboard.tsx"
BACKUP="$DASH_FILE.bak.$(date +%s)"

echo "==> Checking Dashboard file: $DASH_FILE"

if [ ! -f "$DASH_FILE" ]; then
  echo "ERROR: Dashboard.tsx not found."
  exit 1
fi

echo "==> Backing up Dashboard.tsx"
cp "$DASH_FILE" "$BACKUP"

echo "==> Patching fetchDashboardData()..."

python3 <<PY
import re
from pathlib import Path

dash_path = Path("$DASH_FILE")
txt = dash_path.read_text(encoding="utf-8")

pattern = r"const fetchDashboardData\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};"

replacement = """const fetchDashboardData = async () => {
  try {
    const res = await api.get('/dashboard'); // or '/api/dashboard'

    const payload = res.data?.data || {};

    setStats({
      totalFamilies: payload.stats?.totalFamilies || 0,
      totalMembers: payload.stats?.totalMembers || 0,
      totalMemories: payload.stats?.totalMemories || 0,
      totalEvents: payload.stats?.totalEvents || 0
    });

    setFamilies(payload.families || []);
    setRecentActivities(payload.recentActivities || []);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  } finally {
    setLoading(false);
  }
};"""

new_txt, n = re.subn(pattern, replacement, txt, count=1)

if n == 0:
    raise SystemExit("Could not find fetchDashboardData() function.")

dash_path.write_text(new_txt, encoding="utf-8")
print("Dashboard successfully optimized.")
PY

echo "✅ Done."
echo "Now run: npm run dev"
