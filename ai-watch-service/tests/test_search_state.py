from ai_watch.fetch import build_search_state


def test_maps_search_query_and_locations():
    search_state = build_search_state("Data Scientist", [{"formatted_address": "Paris, Île-de-France, FR"}])

    assert search_state["searchQuery"] == "Data Scientist"
    assert search_state["locations"] == [{"formatted_address": "Paris, Île-de-France, FR"}]


def test_omits_empty_filters():
    search_state = build_search_state("Data Scientist", [])

    assert "locations" not in search_state
    assert "workplaceTypes" not in search_state
    assert "seniorityLevel" not in search_state
    assert "commitmentTypes" not in search_state


def test_includes_non_empty_filters():
    search_state = build_search_state(
        "Data Scientist",
        [{"formatted_address": "Paris, Île-de-France, FR"}],
        workplace_types=["Remote", "Hybrid"],
        seniority_levels=["Mid Level"],
        commitment_types=["Full Time", "Contract"],
    )

    assert search_state["workplaceTypes"] == ["Remote", "Hybrid"]
    assert search_state["seniorityLevel"] == ["Mid Level"]
    assert search_state["commitmentTypes"] == ["Full Time", "Contract"]


def test_search_query_is_a_single_string_not_a_list():
    # hiring.cafe's searchQuery does not support an OR of multiple roles (measured:
    # concatenating two roles collapsed a 119-hit result down to 1) — one call per position.
    search_state = build_search_state("Data Scientist", [])

    assert isinstance(search_state["searchQuery"], str)
