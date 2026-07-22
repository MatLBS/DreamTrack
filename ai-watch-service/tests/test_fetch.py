from ai_watch.fetch import fetch_offers


def _make_hit(identity: str, title: str = "Data Scientist") -> dict:
    return {
        "id": identity,
        "source": "csod",
        "apply_url": f"https://acme.example/jobs/{identity}",
        "job_information": {"title": title},
        "v5_processed_job_data": {"company_name": "Acme"},
        "enriched_company_data": {},
        "is_expired": False,
    }


MALFORMED_HIT = {"source": "csod", "job_information": {"title": "Missing id and apply_url"}}


class _FakeHiringCafeClient:
    """Double minimal : couvre juste ce que `fetch.py` appelle."""

    def __init__(self, hits_by_position: dict[str, list[dict]], locations: dict[str, dict | None] | None = None):
        self._hits_by_position = hits_by_position
        self._locations = locations or {}
        self.build_id_calls = 0
        self.searched_positions: list[str] = []
        self.searched_locations: list[list[dict]] = []

    def build_id(self) -> str:
        self.build_id_calls += 1
        return "build-123"

    def resolve_location(self, query: str) -> dict | None:
        return self._locations.get(query, {"formatted_address": query})

    def search(self, build_id: str, search_state: dict) -> list[dict]:
        assert build_id == "build-123"
        position = search_state["searchQuery"]
        self.searched_positions.append(position)
        self.searched_locations.append(search_state.get("locations", []))
        return self._hits_by_position.get(position, [])


def test_one_call_per_position_covering_all_locations():
    client = _FakeHiringCafeClient({"Data Scientist": [_make_hit("a")], "ML Engineer": [_make_hit("b")]})

    offers = fetch_offers(
        ["Data Scientist", "ML Engineer"], locations=["Paris", "Lyon"], client=client
    )

    assert client.searched_positions == ["Data Scientist", "ML Engineer"]
    # both locations resolved once, then reused identically for every position call
    assert len(client.searched_locations[0]) == 2
    assert client.searched_locations[0] == client.searched_locations[1]
    assert {offer.external_id for offer in offers} == {"a", "b"}


def test_truncates_to_max_per_position():
    client = _FakeHiringCafeClient({"Data Scientist": [_make_hit("a"), _make_hit("b"), _make_hit("c")]})

    offers = fetch_offers(["Data Scientist"], max_per_position=2, client=client)

    assert len(offers) == 2


def test_dedupes_across_positions_by_identity():
    same_hit = _make_hit("shared")
    client = _FakeHiringCafeClient({"Data Scientist": [same_hit], "ML Engineer": [same_hit]})

    offers = fetch_offers(["Data Scientist", "ML Engineer"], client=client)

    assert len(offers) == 1


def test_skips_malformed_hits_without_failing_the_run():
    client = _FakeHiringCafeClient({"Data Scientist": [_make_hit("a"), MALFORMED_HIT]})

    offers = fetch_offers(["Data Scientist"], client=client)

    assert len(offers) == 1
    assert offers[0].external_id == "a"


def test_unresolvable_location_is_skipped_not_fatal():
    client = _FakeHiringCafeClient(
        {"Data Scientist": [_make_hit("a")]}, locations={"Atlantis": None, "Paris": {"formatted_address": "Paris"}}
    )

    offers = fetch_offers(["Data Scientist"], locations=["Atlantis", "Paris"], client=client)

    assert len(offers) == 1
    assert client.searched_locations[0] == [{"formatted_address": "Paris"}]
