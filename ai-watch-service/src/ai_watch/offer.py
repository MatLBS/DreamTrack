"""Normalisation d'un `ssrHit` renvoyé par la route de données hiring.cafe."""

from __future__ import annotations

from dataclasses import dataclass

REQUIRED_TOP_FIELDS = ("id", "source", "apply_url")

_UNKNOWN_STRINGS = ("", "Not Mentioned")


class MalformedOfferError(ValueError):
    """Levée quand un `ssrHit` n'a pas les champs minimaux exploitables."""


@dataclass(frozen=True, slots=True)
class RawOffer:
    """Une offre hiring.cafe normalisée depuis un `ssrHit`.

    Les champs texte/numériques sans valeur réelle sont `None` (la source distingue
    déjà "inconnu" d'une vraie valeur — pas de piège `0`-par-défaut comme avec Apify).
    """

    external_id: str
    source: str
    apply_url: str
    title: str
    core_job_title: str | None
    category: str | None
    seniority_level: str | None
    role_type: str | None
    commitment: str | None
    workplace_type: str | None
    location: str | None
    workplace_cities: list[str] | None
    workplace_states: list[str] | None
    workplace_countries: list[str] | None
    salary_min: float | None
    salary_max: float | None
    salary_currency: str | None
    technical_tools: list[str] | None
    min_years_experience: int | None
    bachelors_degree_requirement: str | None
    requirements_summary: str | None
    company_name: str | None
    company_website: str | None
    company_industries: list[str] | None
    company_employees: int | None
    company_hq_country: str | None
    is_expired: bool | None

    @property
    def identity(self) -> tuple[str, str]:
        """Clé de dédoublonnage stable, cohérente avec l'index unique côté DB
        `job_offers (userId, source, externalId)`, et utilisée pour fusionner les
        résultats de plusieurs postes recherchés."""
        return (self.source, self.external_id)


def _str_or_none(value: object) -> str | None:
    if not isinstance(value, str) or value in _UNKNOWN_STRINGS:
        return None
    return value


def _list_or_none(value: object) -> list[str] | None:
    if not value:
        return None
    return list(value)  # type: ignore[arg-type]


def _first_or_none(value: object) -> str | None:
    if not value:
        return None
    first = value[0]  # type: ignore[index]
    return _str_or_none(first)


def normalize(hit: dict) -> RawOffer:
    """Convertit un `ssrHit` brut en `RawOffer`.

    La structure de la source distingue déjà "inconnu" d'une vraie valeur (chaînes
    `""`/`"Not Mentioned"`, tableaux `[]`, `null` numériques) — pas de coercition de
    type de valeurs numériques nécessaire ici, contrairement à l'ancienne source Apify.
    """
    missing = [field for field in REQUIRED_TOP_FIELDS if not hit.get(field)]
    title = (hit.get("job_information") or {}).get("title")
    if not title:
        missing.append("job_information.title")
    if missing:
        raise MalformedOfferError(f"missing required field(s): {', '.join(missing)}")

    v5 = hit.get("v5_processed_job_data") or {}
    enriched = hit.get("enriched_company_data") or {}

    return RawOffer(
        external_id=str(hit["id"]),
        source=str(hit["source"]),
        apply_url=str(hit["apply_url"]),
        title=str(title),
        core_job_title=_str_or_none(v5.get("core_job_title")),
        category=_str_or_none(v5.get("job_category")),
        seniority_level=_str_or_none(v5.get("seniority_level")),
        role_type=_str_or_none(v5.get("role_type")),
        commitment=_first_or_none(v5.get("commitment")),
        workplace_type=_str_or_none(v5.get("workplace_type")),
        location=_str_or_none(v5.get("formatted_workplace_location")),
        workplace_cities=_list_or_none(v5.get("workplace_cities")),
        workplace_states=_list_or_none(v5.get("workplace_states")),
        workplace_countries=_list_or_none(v5.get("workplace_countries")),
        salary_min=v5.get("yearly_min_compensation"),
        salary_max=v5.get("yearly_max_compensation"),
        salary_currency=_str_or_none(v5.get("listed_compensation_currency")),
        technical_tools=_list_or_none(v5.get("technical_tools")),
        min_years_experience=v5.get("min_industry_and_role_yoe"),
        bachelors_degree_requirement=_str_or_none(v5.get("bachelors_degree_requirement")),
        requirements_summary=_str_or_none(v5.get("requirements_summary")),
        company_name=_str_or_none(v5.get("company_name")) or _str_or_none(enriched.get("name")),
        company_website=_str_or_none(v5.get("company_website"))
        or _str_or_none(enriched.get("homepage_uri")),
        company_industries=_list_or_none(enriched.get("industries")),
        company_employees=enriched.get("nb_employees") or None,
        company_hq_country=_str_or_none(enriched.get("hq_country")),
        is_expired=hit.get("is_expired"),
    )
