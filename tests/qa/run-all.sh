#!/bin/zsh
# Full QA run against a LOCAL / STAGING stack. Never point this at production: it creates
# 1,000 candidates, 100 employers, ~450 jobs and ~1,500 applications.
#
# Needs: an API started with EMAIL_DRIVER=log and a high THROTTLE_LIMIT_PER_MIN, writing its
# log to $QA_API_LOG; the web app on $QA_WEB_URL proxying to it; an EMPTY, freshly seeded
# database at $QA_DATABASE_URL (name must contain aajiveka_qa).
#
#   QA_API_URL=http://localhost:4100/api QA_WEB_URL=http://localhost:5174 \
#   QA_API_LOG=/path/api.log QA_STORAGE_ROOT=/path/storage \
#   QA_DATABASE_URL=postgresql://…/aajiveka_qa tests/qa/run-all.sh
set -e
cd "$(dirname "$0")/../.."
rm -rf tests/qa/.state
node tests/qa/seed-candidates.mjs 1000
node tests/qa/seed-employers.mjs 100
node tests/qa/seed-applications.mjs | grep -v applying
node tests/qa/workflows.mjs
node tests/qa/browser-crawl.mjs | grep -v '^ok'
node tests/qa/ui-journeys.mjs
node tests/qa/load.mjs 10,25,50,100 20
