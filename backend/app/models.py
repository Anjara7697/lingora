"""Importe tous les modèles pour enregistrer les tables dans Base.metadata (Alembic, tests)."""

from app.core.database import Base
from app.modules.assessment import models as _assessment  # noqa: F401
from app.modules.commerce import models as _commerce  # noqa: F401
from app.modules.identity import models as _identity  # noqa: F401
from app.modules.learning import models as _learning  # noqa: F401
from app.modules.platform import models as _platform  # noqa: F401
from app.modules.progress import models as _progress  # noqa: F401
from app.modules.speaking import models as _speaking  # noqa: F401
from app.modules.teacher import models as _teacher  # noqa: F401

__all__ = ["Base"]
