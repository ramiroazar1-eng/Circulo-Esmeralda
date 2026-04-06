content = open("src/app/dashboard/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    'import { createClient }',
    'import PlanReviewButtons from "./PlanReviewButtons"\nimport { createClient }'
)
open("src/app/dashboard/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
