"""seed reference data: roles, permissions, skills

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

ROLES = [
    ("STUDENT", "Étudiant", "Apprenant de la plateforme"),
    ("TEACHER", "Enseignant", "Suit les apprenants et leur donne du feedback"),
    ("ADMIN", "Administrateur", "Gère la plateforme"),
]

PERMISSIONS = [
    ("students.read", "Consulter les étudiants"),
    ("students.update", "Modifier les étudiants"),
    ("courses.read", "Consulter les cours"),
    ("courses.create", "Créer des cours"),
    ("courses.update", "Modifier des cours"),
    ("feedback.write", "Rédiger du feedback pédagogique"),
    ("analytics.read", "Consulter les statistiques"),
    ("users.manage", "Gérer les utilisateurs"),
    ("payments.read", "Consulter les paiements"),
]

ROLE_PERMISSIONS = {
    "STUDENT": ["courses.read"],
    "TEACHER": [
        "students.read", "courses.read", "courses.create", "courses.update",
        "feedback.write", "analytics.read",
    ],
    "ADMIN": [code for code, _ in PERMISSIONS],
}

# (code, nom, type, parent)
SKILLS = [
    ("GRAMMAR", "Grammar", "GRAMMAR", None),
    ("VOCABULARY", "Vocabulary", "VOCABULARY", None),
    ("LISTENING", "Listening", "LISTENING", None),
    ("READING", "Reading", "READING", None),
    ("WRITING", "Writing", "WRITING", None),
    ("SPEAKING", "Speaking", "SPEAKING", None),
    ("PRONUNCIATION", "Pronunciation", "PRONUNCIATION", "SPEAKING"),
    ("FLUENCY", "Fluency", "FLUENCY", "SPEAKING"),
]


def upgrade() -> None:
    for code, name, desc in ROLES:
        op.execute(
            f"INSERT INTO roles (code, name, description) VALUES ('{code}', '{name}', '{desc}') "
            "ON CONFLICT (code) DO NOTHING"
        )
    for code, name in PERMISSIONS:
        op.execute(
            f"INSERT INTO permissions (code, name) VALUES ('{code}', '{name}') "
            "ON CONFLICT (code) DO NOTHING"
        )
    for role, perms in ROLE_PERMISSIONS.items():
        for perm in perms:
            op.execute(
                "INSERT INTO role_permissions (role_id, permission_id) "
                f"SELECT r.id, p.id FROM roles r, permissions p WHERE r.code='{role}' AND p.code='{perm}' "
                "ON CONFLICT DO NOTHING"
            )
    for code, name, type_, parent in SKILLS:
        parent_sql = f"(SELECT id FROM skills WHERE code='{parent}')" if parent else "NULL"
        op.execute(
            "INSERT INTO skills (code, name, type, parent_id) "
            f"VALUES ('{code}', '{name}', '{type_}', {parent_sql}) ON CONFLICT (code) DO NOTHING"
        )


def downgrade() -> None:
    op.execute("DELETE FROM skills WHERE code IN (" + ",".join(f"'{s[0]}'" for s in SKILLS) + ")")
    op.execute("DELETE FROM roles WHERE code IN ('STUDENT','TEACHER','ADMIN')")
    op.execute(
        "DELETE FROM permissions WHERE code IN (" + ",".join(f"'{p[0]}'" for p in PERMISSIONS) + ")"
    )
