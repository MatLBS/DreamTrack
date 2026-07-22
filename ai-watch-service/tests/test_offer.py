import pytest

from ai_watch.offer import MalformedOfferError, normalize

VALID_HIT = {
    "id": "csod___acme___123",
    "source": "csod",
    "apply_url": "https://acme.example/jobs/123",
    "job_information": {"title": "Data Scientist"},
    "v5_processed_job_data": {
        "core_job_title": "Data Scientist",
        "job_category": "Data and Analytics",
        "seniority_level": "Mid Level",
        "role_type": "Individual Contributor",
        "commitment": ["Full Time"],
        "workplace_type": "Remote",
        "formatted_workplace_location": "Paris, Île-de-France, France",
        "workplace_cities": ["Paris, Île-de-France, FR"],
        "workplace_states": ["Île-de-France, FR"],
        "workplace_countries": ["FR"],
        "yearly_min_compensation": 45000,
        "yearly_max_compensation": 60000,
        "listed_compensation_currency": "EUR",
        "technical_tools": ["Python", "SQL"],
        "min_industry_and_role_yoe": 3,
        "bachelors_degree_requirement": "Required",
        "requirements_summary": "3+ years of experience with Python and SQL.",
        "company_name": "Acme",
        "company_website": "acme.example",
    },
    "enriched_company_data": {
        "name": "Acme",
        "homepage_uri": "acme.example",
        "industries": ["Software"],
        "nb_employees": 250,
        "hq_country": "FR",
    },
    "is_expired": False,
}


def test_normalizes_a_well_formed_hit():
    offer = normalize(VALID_HIT)

    assert offer.external_id == "csod___acme___123"
    assert offer.source == "csod"
    assert offer.title == "Data Scientist"
    assert offer.salary_min == 45000
    assert offer.salary_max == 60000
    assert offer.technical_tools == ["Python", "SQL"]
    assert offer.min_years_experience == 3
    assert offer.requirements_summary == "3+ years of experience with Python and SQL."
    assert offer.identity == ("csod", "csod___acme___123")


def test_zero_years_experience_is_a_real_value_not_unknown():
    # Unlike the old Apify source, this source distinguishes "0" from "unknown" for real —
    # no coercion needed, 0 must be preserved as-is.
    hit = {
        **VALID_HIT,
        "v5_processed_job_data": {**VALID_HIT["v5_processed_job_data"], "min_industry_and_role_yoe": 0},
    }

    offer = normalize(hit)

    assert offer.min_years_experience == 0


def test_missing_years_experience_is_none():
    hit = {
        **VALID_HIT,
        "v5_processed_job_data": {**VALID_HIT["v5_processed_job_data"], "min_industry_and_role_yoe": None},
    }

    offer = normalize(hit)

    assert offer.min_years_experience is None


@pytest.mark.parametrize(
    ("field", "unknown_value"),
    [
        ("bachelors_degree_requirement", "Not Mentioned"),
        ("seniority_level", ""),
        ("technical_tools", []),
    ],
)
def test_unknown_markers_become_none(field, unknown_value):
    hit = {**VALID_HIT, "v5_processed_job_data": {**VALID_HIT["v5_processed_job_data"], field: unknown_value}}

    offer = normalize(hit)

    assert getattr(offer, field) is None


@pytest.mark.parametrize("missing_field", ["id", "source", "apply_url"])
def test_missing_required_top_field_raises(missing_field):
    hit = {key: value for key, value in VALID_HIT.items() if key != missing_field}

    with pytest.raises(MalformedOfferError):
        normalize(hit)


def test_missing_title_raises():
    hit = {**VALID_HIT, "job_information": {}}

    with pytest.raises(MalformedOfferError):
        normalize(hit)
