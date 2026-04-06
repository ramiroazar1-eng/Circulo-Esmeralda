content = open("src/app/dashboard/page.tsx", "r", encoding="utf-8").read()
if "PlanReviewButtons" not in content:
    content = content.replace(
        'import type { PatientAlert',
        'import PlanReviewButtons from "./PlanReviewButtons"\nimport type { PatientAlert'
    )
    open("src/app/dashboard/page.tsx", "w", encoding="utf-8").write(content)
    print("OK import agregado")
else:
    print("Ya existe")
